export const LAYOUT = {
  CANVAS: {
    MIN_WIDTH: 1000,
    MIN_HEIGHT: 600,
    DEFAULT_WIDTH: 800,
    DEFAULT_HEIGHT: 600,
    INITIAL_HEIGHT: 800,
  },
  PADDING: {
    DEFAULT: 100,
    EDGE: 200,
    RIGHT: 100,
    BOTTOM: 100,
  },
  MARGIN: {
    INITIAL: 100,
  },
  GRID: {
    CELL_WIDTH: 160,
    CELL_HEIGHT: 60,
    COL_NUM: {
      NORMAL: 100,
      COMPACT: 100,
    },
    MAX_COL: 200,
    ITEM_SIZE: {
      WIDTH: 2,
      HEIGHT: 3,
      MIN_WIDTH: 1,
      MIN_HEIGHT: 3,
    },
    TOTAL_WIDTH: '600dvw',
    ROW_HEIGHT: {
      NORMAL: 50,
      COMPACT: 35,
    },
    MARGIN: {
      NORMAL: 10,
      COMPACT: 5,
    },
  },
  MODAL: {
    MIN_MARGIN: 50,
  },
} as const;
