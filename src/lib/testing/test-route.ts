/** True when the bundled /test automation page is available. */
export function testRouteAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_TEST_TOOLS === "true"
  );
}
