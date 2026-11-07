"""Step 3a: decide whether an id shared by an event and a span is one subject or two."""

from common import connect, log

DECISIONS = {
    "one": "reviewed",       # one subject: the event is the key moment, the span the whole period
    "split": "needs_split",  # two subjects: the span needs its own id (done with Claude; see doc 11)
}


def decide(ids, decision, via="cli"):
    if decision not in DECISIONS:
        print(f"  ✗ decision must be one of {', '.join(DECISIONS)}")
        return 1
    conn = connect()
    ok = True
    for entity_id in ids:
        cur = conn.execute("UPDATE entities SET editorial_status = ?, updated_at = datetime('now') "
                           "WHERE id = ? AND editorial_status IN ('needs_review_identity', 'needs_split', 'reviewed') "
                           "AND id IN (SELECT entity_id FROM events) AND id IN (SELECT entity_id FROM time_spans)",
                           (DECISIONS[decision], entity_id))
        if cur.rowcount:
            log(conn, f"identity-{decision}", entity_id, via=via)
            print(f"  ✓ {entity_id}: {'one subject' if decision == 'one' else 'flagged for a split'}")
        else:
            ok = False
            print(f"  ✗ not a shared event/span id: {entity_id}")
    conn.commit()
    conn.close()
    return 0 if ok else 1
