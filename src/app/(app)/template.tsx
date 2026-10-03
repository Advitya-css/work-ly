/**
 * Runs on every page change in the app. The fade used to last half a
 * second, which made every click feel slow even when the page was ready;
 * it's now short enough to read as a transition, not a wait.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in duration-150 fill-mode-both motion-reduce:animate-none">
      {children}
    </div>
  );
}
