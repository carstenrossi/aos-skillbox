-- Migration 8: Create tools table
-- Tools für die Toolbox mit Admin-verwaltbaren externen Links

CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT NOT NULL, -- Icon-Name (z.B. 'FileText', 'Globe', etc.)
    sort_order INTEGER NOT NULL DEFAULT 0, -- Reihenfolge für Sortierung
    is_active BOOLEAN NOT NULL DEFAULT 1, -- Admin kann Tools aktivieren/deaktivieren
    is_external BOOLEAN NOT NULL DEFAULT 1, -- Ob Link extern geöffnet wird
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT, -- User ID des Erstellers
    updated_by TEXT  -- User ID des letzten Bearbeiters
);

-- Index für bessere Performance bei Sortierung
CREATE INDEX IF NOT EXISTS idx_tools_sort_order ON tools(sort_order, is_active);
CREATE INDEX IF NOT EXISTS idx_tools_active ON tools(is_active);

-- Trigger für updated_at
CREATE TRIGGER IF NOT EXISTS tools_updated_at 
    AFTER UPDATE ON tools
    FOR EACH ROW
BEGIN
    UPDATE tools SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END; 