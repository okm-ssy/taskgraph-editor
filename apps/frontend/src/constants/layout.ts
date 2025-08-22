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
      WIDTH: 3,
      HEIGHT: 3,
      MIN_WIDTH: 2,
      MIN_HEIGHT: 3,
    },
    TOTAL_WIDTH: '200dvw',
    ROW_HEIGHT: {
      NORMAL: 50,
      COMPACT: 35,
    },
    MARGIN: {
      NORMAL: 10,
      COMPACT: 10,
      HORIZONTAL: 40, // 横方向の間隔を大きくして矢印が見えるように
    },
  },
  MODAL: {
    MIN_MARGIN: 50,
  },
  CONVERSION: {
    PIXEL_PER_GRID_X: 80, // 1グリッド列あたりのピクセル数
    PIXEL_PER_GRID_Y: 60, // 1グリッド行あたりのピクセル数
    GRID_TO_PIXEL_X: 80, // グリッド座標をピクセル座標に変換する係数
    GRID_TO_PIXEL_Y: 60, // グリッド座標をピクセル座標に変換する係数
  },
} as const;
