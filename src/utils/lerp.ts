export default function lerp(percentage: number, max: number, min: number) {
  const diff = max - min;
  return diff * percentage + min;
}
