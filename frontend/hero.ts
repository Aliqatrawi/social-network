import { heroui } from "@heroui/react";

export default heroui({
  themes: {
    light: {
      colors: {
        background: "#FAF7F4",
        foreground: "#2D2520",
        primary: {
          50: "#fff5ec",
          100: "#ffe6d0",
          200: "#ffd2a8",
          300: "#ffbc7d",
          400: "#ffab65",
          500: "#FF9B51",
          600: "#e88a45",
          700: "#cc7639",
          800: "#a5602e",
          900: "#7a4622",
          DEFAULT: "#FF9B51",
          foreground: "#ffffff",
        },
        secondary: {
          50: "#f7f5f3",
          100: "#ede9e5",
          200: "#e0dbd5",
          300: "#d3ccc5",
          400: "#c7bfb7",
          500: "#BDB4AB",
          600: "#a89e95",
          700: "#90867d",
          800: "#786e65",
          900: "#60574f",
          DEFAULT: "#BDB4AB",
          foreground: "#2D2520",
        },
        focus: "#FF9B51",
        content1: {
          DEFAULT: "#FFFFFF",
          foreground: "#2D2520",
        },
        content2: {
          DEFAULT: "#F5F1ED",
          foreground: "#2D2520",
        },
        content3: {
          DEFAULT: "#EDE8E3",
          foreground: "#2D2520",
        },
        content4: {
          DEFAULT: "#E5DFD9",
          foreground: "#2D2520",
        },
      },
    },
    dark: {
      colors: {
        background: "#141414",
        foreground: "#F5F1ED",
        primary: {
          50: "#7a4622",
          100: "#a5602e",
          200: "#cc7639",
          300: "#e88a45",
          400: "#FF9B51",
          500: "#FF9B51",
          600: "#ffab65",
          700: "#ffbc7d",
          800: "#ffd2a8",
          900: "#fff5ec",
          DEFAULT: "#FF9B51",
          foreground: "#ffffff",
        },
        secondary: {
          50: "#60574f",
          100: "#786e65",
          200: "#90867d",
          300: "#a89e95",
          400: "#BDB4AB",
          500: "#BDB4AB",
          600: "#c7bfb7",
          700: "#d3ccc5",
          800: "#e0dbd5",
          900: "#f7f5f3",
          DEFAULT: "#BDB4AB",
          foreground: "#2D2520",
        },
        focus: "#FF9B51",
        content1: {
          DEFAULT: "#1e1e1e",
          foreground: "#F5F1ED",
        },
        content2: {
          DEFAULT: "#282828",
          foreground: "#F5F1ED",
        },
        content3: {
          DEFAULT: "#333333",
          foreground: "#F5F1ED",
        },
        content4: {
          DEFAULT: "#3d3d3d",
          foreground: "#F5F1ED",
        },
      },
    },
  },
});
