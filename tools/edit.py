"""Edit an existing event or span (ids never change; they're stable keys for DateLinks, milestones and saves)."""

from common import connect, ensure_schema, log


def rename(entity_id, name, description=None, facet="event", via="cli"):
    """Rename an event or span, optionally with a new description.

    A renamed event keeps its old name as a search alias, so DateGolf still finds it.
    """
    name = name.strip()
    if not name:
        print("  ✗ the new name is empty")
        return 1
    table = {"event": "events", "span": "time_spans"}[facet]
    conn = connect()
    ensure_schema(conn)
    row = conn.execute(f"SELECT name, description FROM {table} WHERE entity_id = ?", (entity_id,)).fetchone()
    if row is None:
        print(f"  ✗ no {facet} with id {entity_id}")
        conn.close()
        return 1
    old = row["name"]
    if facet == "event" and conn.execute("SELECT 1 FROM events WHERE name = ? AND entity_id <> ?",
                                         (name, entity_id)).fetchone():
        print(f"  ✗ another event is already called {name!r}")
        conn.close()
        return 1
    conn.execute(f"UPDATE {table} SET name = ?, description = coalesce(?, description) WHERE entity_id = ?",
                 (name, description, entity_id))
    if facet == "span":
        conn.execute("UPDATE entities SET updated_at = datetime('now') WHERE id = ?", (entity_id,))
    if facet == "event" and old != name:
        aliases = {r[0].casefold() for r in conn.execute("SELECT alias FROM event_aliases WHERE entity_id = ?",
                                                         (entity_id,))}
        if old.casefold() not in aliases:
            conn.execute("INSERT INTO event_aliases VALUES (?, (SELECT coalesce(max(position), -1) + 1 "
                         "FROM event_aliases WHERE entity_id = ?), ?)", (entity_id, entity_id, old))
    detail = f"{old!r} → {name!r}" + ("; new description" if description else "")
    log(conn, f"rename-{facet}", entity_id, detail, via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ {entity_id}: {detail}")
    return 0
