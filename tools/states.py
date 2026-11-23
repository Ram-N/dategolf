"""Which state an event belongs to, for Date Flow's "Empires & states" axis (doc 18 item 2a).

A state is a span of kind 'empire'. An event's states are its reviewed rows here plus the states its reviewed
links already name (part_of / began / ended). An event of two states (a war, a conquest) belongs to both
(Ram, 2026-11-23). Tie an event to the most specific state; the app rolls a sub-state (Khalji Dynasty) up
into its parent (Delhi Sultanate) when it needs to.

Batch file (JSON):
  {"origin": "ai_drafted:<model>", "ties": [{"event": <id>, "states": [<span id>, ...], "note"?}, ...]}
One bad tie rejects the whole batch.
"""

import json
from pathlib import Path

from common import connect, ensure_schema, log

LINK_TYPES = ("part_of", "began", "ended")  # event → state links that already place an event in a state
SLACK = 25  # years of leeway at a state's edges when either date is approximate


def _states(conn):
    """id → row for every state span."""
    return {r["entity_id"]: r for r in conn.execute(
        "SELECT entity_id, name, start_year, end_year, approximate FROM time_spans WHERE kind = 'empire'")}


def _parents(conn):
    """state id → the state it is part of (Khalji Dynasty → Delhi Sultanate)."""
    return dict(conn.execute(
        "SELECT r.source_entity_id, r.target_entity_id FROM relationships r "
        "JOIN time_spans a ON a.entity_id = r.source_entity_id AND a.kind = 'empire' "
        "JOIN time_spans b ON b.entity_id = r.target_entity_id AND b.kind = 'empire' "
        "WHERE r.relationship_type = 'part_of' AND r.editorial_status = 'reviewed'").fetchall())


def linked(conn):
    """event id → the states its reviewed links already name: part_of / began / ended a state, or a span that is
    itself (through part_of) inside a state (beginning "Reign of Shah Jahan" puts an event in the Mughal Empire)."""
    states = {r[0] for r in conn.execute("SELECT entity_id FROM time_spans WHERE kind = 'empire'")}
    up = dict(conn.execute(
        "SELECT r.source_entity_id, r.target_entity_id FROM relationships r "
        "JOIN time_spans a ON a.entity_id = r.source_entity_id JOIN time_spans b ON b.entity_id = r.target_entity_id "
        "WHERE r.relationship_type = 'part_of' AND r.editorial_status = 'reviewed'").fetchall())

    def state_of(span):
        seen = set()
        while span and span not in states and span not in seen:
            seen.add(span)
            span = up.get(span)
        return span if span in states else None

    out = {}
    for e, s in conn.execute(
            f"SELECT r.source_entity_id, r.target_entity_id FROM relationships r "
            f"JOIN events e ON e.entity_id = r.source_entity_id JOIN time_spans t ON t.entity_id = r.target_entity_id "
            f"WHERE r.editorial_status = 'reviewed' AND r.relationship_type IN ({','.join('?' * len(LINK_TYPES))})",
            LINK_TYPES):
        state = state_of(s)
        if state:
            out.setdefault(e, set()).add(state)
    return out


def tie_problems(t, events, states, parents, taken):
    """What's wrong with one tie (empty if nothing). taken: (event, state) pairs already known."""
    eid = t.get("event") if isinstance(t, dict) else None
    if eid not in events:
        return [f"unknown event {eid!r}"]
    sids = t.get("states")
    if not (isinstance(sids, list) and sids and all(isinstance(s, str) for s in sids)):
        return [f"{eid}: needs a list of states"]
    problems = []
    if len(set(sids)) < len(sids):
        problems.append(f"{eid}: lists a state twice")
    year, approx = events[eid]
    for sid in sids:
        s = states.get(sid)
        if s is None:
            problems.append(f"{eid}: {sid!r} is not a state (a span of kind empire)")
            continue
        if (eid, sid) in taken:
            problems.append(f"{eid}: already tied to {sid}")
        slack = SLACK if approx or s["approximate"] else 0
        if not s["start_year"] - slack <= year <= s["end_year"] + slack:
            problems.append(f"{eid} ({year}): outside {s['name']} ({s['start_year']} to {s['end_year']})")
        p = parents.get(sid)
        while p:
            if p in sids:
                problems.append(f"{eid}: {sid} is part of {p}; tie to the most specific state only")
            p = parents.get(p)
    return problems


def load(path, via="cli"):
    """Add a batch of event → state ties as proposed. One bad tie rejects the whole batch."""
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    ties = batch.get("ties")
    if not isinstance(ties, list) or not ties or not batch.get("origin"):
        print('  ✗ the file needs an "origin" and a "ties" list')
        return 1
    conn = connect()
    ensure_schema(conn)
    events = {r[0]: (r[1], bool(r[2])) for r in conn.execute("SELECT entity_id, year, is_approximate FROM events")}
    states, parents = _states(conn), _parents(conn)
    taken = {(e, s) for e, s in conn.execute("SELECT event_id, state_id FROM event_states")}
    taken |= {(e, s) for e, ss in linked(conn).items() for s in ss}
    problems = []
    seen = [t.get("event") for t in ties if isinstance(t, dict)]
    if len(set(seen)) < len(seen):
        problems.append("an event appears twice (list all its states in one tie)")
    for t in ties:
        problems += tie_problems(t, events, states, parents, taken)
    if problems:
        print(f"  ✗ Nothing loaded ({len(problems)} problems):\n    " + "\n    ".join(problems))
        conn.close()
        return 1
    n = 0
    for t in ties:
        for sid in t["states"]:
            conn.execute("INSERT INTO event_states (event_id, state_id, origin, note) VALUES (?, ?, ?, ?)",
                         (t["event"], sid, batch["origin"], t.get("note")))
            n += 1
        log(conn, "load-state", t["event"], f"{', '.join(t['states'])} from {batch['origin']}", via=via)
    conn.commit()
    conn.close()
    print(f"  Loaded {n} ties for {len(ties)} events as proposed. Review them on the dashboard "
          "(Review → States) or with approve-states / reject-states.")
    return 0


def _split(key):
    event, _, state = key.partition("|")
    return event, state


def approve(keys, via="cli"):
    """Mark proposed ties reviewed. A key is "event|state"."""
    conn = connect()
    ensure_schema(conn)
    ok = True
    for key in keys:
        e, s = _split(key)
        cur = conn.execute("UPDATE event_states SET status = 'reviewed' "
                           "WHERE event_id = ? AND state_id = ? AND status = 'proposed'", (e, s))
        if cur.rowcount:
            log(conn, "approve-state", e, s, via=via)
        ok = ok and bool(cur.rowcount)
        print(f"  {'✓ approved' if cur.rowcount else '✗ not a proposed tie:'} {e} → {s}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def reject(keys, reason, via="cli"):
    """Delete proposed ties, logging them and the reason. A key is "event|state"."""
    if not reason or not reason.strip():
        print("  ✗ a reason is required")
        return 1
    conn = connect()
    ensure_schema(conn)
    ok = True
    for key in keys:
        e, s = _split(key)
        cur = conn.execute("DELETE FROM event_states WHERE event_id = ? AND state_id = ? AND status = 'proposed'",
                           (e, s))
        if cur.rowcount:
            log(conn, "reject-state", e, f"{s} — {reason.strip()}", via=via)
        ok = ok and bool(cur.rowcount)
        print(f"  {'✓ rejected' if cur.rowcount else '✗ not a proposed tie:'} {e} → {s}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def exported(conn):
    """event id → its states (sorted), for states.json: reviewed ties plus reviewed links, published items only."""
    if not conn.execute("SELECT 1 FROM sqlite_master WHERE name = 'event_states'").fetchone():
        return {}
    unpublished = {r[0] for r in conn.execute("SELECT id FROM entities WHERE editorial_status = 'proposed'")}
    out = {e: set(ss) for e, ss in linked(conn).items()}
    for e, s in conn.execute("SELECT event_id, state_id FROM event_states WHERE status = 'reviewed'"):
        out.setdefault(e, set()).add(s)
    return {e: sorted(ss - unpublished) for e, ss in sorted(out.items())
            if e not in unpublished and ss - unpublished}
