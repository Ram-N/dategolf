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


def set_span_years(entity_id, start, end, approximate=None, via="cli"):
    """Change a span's years. approximate: True marks it 'c.', False clears that, None leaves it."""
    if 0 in (start, end) or start > end:
        print(f"  ✗ bad years {start} to {end} (no year 0; start must not be after end)")
        return 1
    conn = connect()
    ensure_schema(conn)
    row = conn.execute("SELECT start_year, end_year, approximate FROM time_spans WHERE entity_id = ?",
                       (entity_id,)).fetchone()
    if row is None:
        print(f"  ✗ no span with id {entity_id}")
        conn.close()
        return 1
    approx = row["approximate"] if approximate is None else (1 if approximate else None)
    conn.execute("UPDATE time_spans SET start_year = ?, end_year = ?, approximate = ? WHERE entity_id = ?",
                 (start, end, approx, entity_id))
    conn.execute("UPDATE entities SET updated_at = datetime('now') WHERE id = ?", (entity_id,))
    c = lambda a: "c. " if a else ""
    detail = (f"{c(row['approximate'])}{row['start_year']} to {row['end_year']} → "
              f"{c(approx)}{start} to {end}")
    log(conn, "set-span-years", entity_id, detail, via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ {entity_id}: {detail}")
    return 0


def set_event_date(entity_id, year=None, approximate=None, display=None, via="cli"):
    """Change an event's year, its 'c.' flag and/or its date_display (the true range). None leaves a field."""
    if year == 0:
        print("  ✗ there is no year 0 (-1 = 1 BCE)")
        return 1
    conn = connect()
    ensure_schema(conn)
    row = conn.execute("SELECT year, is_approximate, date_display FROM events WHERE entity_id = ?",
                       (entity_id,)).fetchone()
    if row is None:
        print(f"  ✗ no event with id {entity_id}")
        conn.close()
        return 1
    new = (row["year"] if year is None else year,
           row["is_approximate"] if approximate is None else (1 if approximate else None),
           row["date_display"] if display is None else (display.strip() or None))
    conn.execute("UPDATE events SET year = ?, is_approximate = ?, date_display = ? WHERE entity_id = ?",
                 (*new, entity_id))
    show = lambda y, a, d: f"{'c. ' if a else ''}{y}" + (f" ({d})" if d else "")
    detail = f"{show(*row)} → {show(*new)}"
    log(conn, "set-event-date", entity_id, detail, via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ {entity_id}: {detail}")
    return 0


def set_dateflow_only(entity_id, reason=None, remove=False, via="cli"):
    """Show an event only in DateFlow (not DatePick or DateGolf): for dates too disputed to guess fairly."""
    conn = connect()
    ensure_schema(conn)
    if not conn.execute("SELECT 1 FROM events WHERE entity_id = ?", (entity_id,)).fetchone():
        print(f"  ✗ no event with id {entity_id}")
        conn.close()
        return 1
    if remove:
        conn.execute("DELETE FROM dateflow_only_events WHERE entity_id = ?", (entity_id,))
        detail = "back in DatePick and DateGolf"
    else:
        if not (reason or "").strip():
            print("  ✗ a reason is required")
            conn.close()
            return 1
        conn.execute("INSERT OR REPLACE INTO dateflow_only_events VALUES (?, ?)", (entity_id, reason.strip()))
        detail = f"DateFlow only: {reason.strip()}"
    log(conn, "dateflow-only", entity_id, detail, via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ {entity_id}: {detail}")
    return 0


def set_memory_aid(item_id, body, via="cli"):
    """Replace one DateLinks memory-aid item's text (learning_content_items)."""
    if not body.strip():
        print("  ✗ the text is empty")
        return 1
    conn = connect()
    row = conn.execute("SELECT g.entity_id, i.body FROM learning_content_items i "
                       "JOIN learning_content_groups g ON g.id = i.group_id WHERE i.id = ?", (item_id,)).fetchone()
    if row is None:
        print(f"  ✗ no memory-aid item #{item_id}")
        conn.close()
        return 1
    conn.execute("UPDATE learning_content_items SET body = ? WHERE id = ?", (body.strip(), item_id))
    log(conn, "set-memory-aid", row["entity_id"], f"item #{item_id}: {row['body'][:60]}… → {body.strip()[:60]}…",
        via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ item #{item_id} ({row['entity_id']}) updated")
    return 0


def rename_memory_aid_group(entity_id, old_label, new_label, via="cli"):
    """Rename one of an entity's DateLinks groups, e.g. 'Year of 588 BCE' → 'Year of 587 BCE'."""
    conn = connect()
    cur = conn.execute("UPDATE learning_content_groups SET label = ? WHERE entity_id = ? AND label = ?",
                       (new_label.strip(), entity_id, old_label))
    if not cur.rowcount:
        print(f"  ✗ {entity_id} has no group {old_label!r}")
        conn.close()
        return 1
    log(conn, "rename-memory-aid-group", entity_id, f"{old_label!r} → {new_label.strip()!r}", via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ {entity_id}: group {old_label!r} → {new_label.strip()!r}")
    return 0
