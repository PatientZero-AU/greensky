import CrtMonitor from "./CrtMonitor";
import FlightCanvas from "./FlightCanvas";
import InfraBanner from "./InfraBanner";
import StackCounter from "./StackCounter";

export default function Home() {
  return (
    <main className="page-root">
      <CrtMonitor>
        <FlightCanvas />
      </CrtMonitor>
      <InfraBanner />
      <StackCounter />
    </main>
  );
}
