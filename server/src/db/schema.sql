-- Diário: um registro por dia (peso + consumo agregado do dia)
CREATE TABLE IF NOT EXISTS entries (
  date      TEXT PRIMARY KEY,
  peso      REAL,
  calorias  REAL,
  proteina  REAL,
  sodio     REAL,
  agua      REAL,
  whey      INTEGER NOT NULL DEFAULT 0,
  creatina  INTEGER NOT NULL DEFAULT 0
);

-- Metas diárias — linha única (id fixo em 1)
CREATE TABLE IF NOT EXISTS metas (
  id        INTEGER PRIMARY KEY CHECK (id = 1),
  calorias  REAL NOT NULL,
  proteina  REAL NOT NULL,
  sodio     REAL NOT NULL,
  agua      REAL NOT NULL
);
INSERT OR IGNORE INTO metas (id, calorias, proteina, sodio, agua) VALUES (1, 2400, 140, 2000, 2.8);

CREATE TABLE IF NOT EXISTS exames_sangue (
  id        TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  valor     REAL NOT NULL,
  unidade   TEXT,
  ref_min   REAL,
  ref_max   REAL,
  data      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exames_sangue_nome ON exames_sangue(nome);

CREATE TABLE IF NOT EXISTS exames_imagem (
  id        TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  data      TEXT NOT NULL,
  medico    TEXT,
  conclusao TEXT
);

CREATE TABLE IF NOT EXISTS treino_forca (
  id          TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  exercicio   TEXT NOT NULL,
  series      REAL NOT NULL,
  repeticoes  REAL NOT NULL,
  carga       REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_treino_forca_exercicio ON treino_forca(exercicio);

CREATE TABLE IF NOT EXISTS treino_cardio (
  id        TEXT PRIMARY KEY,
  data      TEXT NOT NULL,
  tipo      TEXT NOT NULL,
  tempo     REAL NOT NULL,
  distancia REAL,
  fc        REAL,
  calorias  REAL
);
CREATE INDEX IF NOT EXISTS idx_treino_cardio_tipo ON treino_cardio(tipo);
