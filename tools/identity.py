"""Step 3a: decide whether an id shared by an event and a span is one subject or two."""

from common import connect, log

DECISIONS = {
    "one": "reviewed",        # one subject: the event is the key moment, the span the whole period
    "split": "needs_split",   # two subjects: the span needs its own id (done with Claude; see doc 11)
    "drop-span": "reviewed",  # keep only the event: the span (and its span categories) is deleted
    "drop-event": "reviewed", # keep only the span: the event (aliases, event categories) is deleted
}


def decide(ids, decision, via="cli"):
    if decision not in DECISIONS:
        print(f"  ✗ decision must be one of {', '.join(DECISIONS)}")
        return 1
    conn = connect()
    ok = True
    for entity_id in ids:
        if decision == "drop-event":
            # Milestones and DateLinks hang off events: dropping the event would orphan them.
            blockers = [name for name, sql in (
                ("it is a DateFlow milestone", "SELECT 1 FROM milestone_designations WHERE entity_id = ?"),
                ("it has DateLinks content", "SELECT 1 FROM learning_content_groups WHERE entity_id = ?"),
            ) if conn.execute(sql, (entity_id,)).fetchone()]
            if blockers:
                ok = False
                print(f"  ✗ {entity_id}: can't drop the event because {' and '.join(blockers)}. "
                      "Move or remove that first.")
                continue
        cur = conn.execute("UPDATE entities SET editorial_status = ?, updated_at = datetime('now') "
                           "WHERE id = ? AND editorial_status IN ('needs_review_identity', 'needs_split', 'reviewed') "
                           "AND id IN (SELECT entity_id FROM events) AND id IN (SELECT entity_id FROM time_spans)",
                           (DECISIONS[decision], entity_id))
        if cur.rowcount and decision == "drop-span":
            span = conn.execute("SELECT name, start_year, end_year FROM time_spans WHERE entity_id = ?",
                                (entity_id,)).fetchone()
            conn.execute("DELETE FROM entity_categories WHERE entity_id = ? AND facet = 'span'", (entity_id,))
            conn.execute("DELETE FROM time_spans WHERE entity_id = ?", (entity_id,))
            conn.execute("UPDATE entities SET primary_type = 'event' WHERE id = ?", (entity_id,))
            log(conn, "identity-drop-span", entity_id, f"removed span '{span[0]}' {span[1]} to {span[2]}", via=via)
            print(f"  ✓ {entity_id}: span removed, event kept")
        elif cur.rowcount and decision == "drop-event":
            event = conn.execute("SELECT name, year FROM events WHERE entity_id = ?", (entity_id,)).fetchone()
            kind = conn.execute("SELECT kind FROM time_spans WHERE entity_id = ?", (entity_id,)).fetchone()[0]
            conn.execute("DELETE FROM entity_categories WHERE entity_id = ? AND facet = 'event'", (entity_id,))
            conn.execute("DELETE FROM events WHERE entity_id = ?", (entity_id,))  # cascades to its aliases
            conn.execute("UPDATE entities SET primary_type = ? WHERE id = ?", (kind, entity_id))
            log(conn, "identity-drop-event", entity_id, f"removed event '{event[0]}' ({event[1]})", via=via)
            print(f"  ✓ {entity_id}: event removed, span kept")
        elif cur.rowcount:
            log(conn, f"identity-{decision}", entity_id, via=via)
            print(f"  ✓ {entity_id}: {'one subject' if decision == 'one' else 'flagged for a split'}")
        else:
            ok = False
            print(f"  ✗ not a shared event/span id: {entity_id}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def split(entity_id, new_span_id, via="cli"):
    """Give a shared id's span its own id. The event keeps `entity_id`; the span moves to `new_span_id`.

    The span keeps its categories, gets a copy of the country tags, and is linked from the event
    with a reviewed `part_of` relationship.
    """
    conn = connect()
    row = conn.execute("SELECT n.editorial_status, s.kind, s.name FROM entities n "
                       "JOIN events e ON e.entity_id = n.id JOIN time_spans s ON s.entity_id = n.id "
                       "WHERE n.id = ?", (entity_id,)).fetchone()
    problems = []
    if row is None:
        problems.append(f"{entity_id} is not a shared event/span id")
    if conn.execute("SELECT 1 FROM entities WHERE id = ?", (new_span_id,)).fetchone():
        problems.append(f"{new_span_id} already exists")
    if new_span_id == entity_id or not new_span_id.replace("-", "").isalnum() or new_span_id != new_span_id.lower():
        problems.append(f"{new_span_id} must be a new lowercase kebab-case id")
    if problems:
        print("  ✗ " + "; ".join(problems))
        conn.close()
        return 1
    status, kind, span_name = row
    conn.execute("INSERT INTO entities (id, primary_type, editorial_status) VALUES (?, ?, 'reviewed')",
                 (new_span_id, kind))
    conn.execute("UPDATE time_spans SET entity_id = ? WHERE entity_id = ?", (new_span_id, entity_id))
    conn.execute("UPDATE entity_categories SET entity_id = ? WHERE entity_id = ? AND facet = 'span'",
                 (new_span_id, entity_id))
    conn.execute("INSERT INTO entity_countries (entity_id, position, country, confidence, status, note, role) "
                 "SELECT ?, position, country, confidence, status, note, role FROM entity_countries "
                 "WHERE entity_id = ?", (new_span_id, entity_id))
    event_name = conn.execute("SELECT name FROM events WHERE entity_id = ?", (entity_id,)).fetchone()[0]
    conn.execute("INSERT INTO relationships (source_entity_id, relationship_type, target_entity_id, description, "
                 "confidence, editorial_status) VALUES (?, 'part_of', ?, ?, 'high', 'reviewed')",
                 (entity_id, new_span_id, f"'{event_name}' is a moment within '{span_name}' (created by the split)."))
    conn.execute("UPDATE entities SET editorial_status = 'reviewed', primary_type = 'event', "
                 "updated_at = datetime('now') WHERE id = ?", (entity_id,))
    log(conn, "identity-split-done", entity_id, f"span moved to {new_span_id}; part_of link added", via=via)
    log(conn, "identity-split-done", new_span_id, f"new span id, split from {entity_id}", via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ {entity_id}: span moved to {new_span_id}, linked with part_of")
    return 0
