// TS 6.0 (Expo SDK 56) stopped tolerating side-effect imports of untyped
// modules, which broke `import "./global.css"` (the NativeWind/Tailwind entry).
// Declaring the CSS module shape restores it without loosening anything else.
declare module "*.css";
