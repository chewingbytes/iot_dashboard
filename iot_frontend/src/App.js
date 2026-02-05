import { useEffect, useMemo, useState } from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import awsExports from "./aws-exports";
import "./App.css";

Amplify.configure(awsExports);
const client = generateClient();

const listMyIotTables = /* GraphQL */ `
  query ListMyIotTables($limit: Int) {
    listMyIotTables(limit: $limit) {
      items {
        device_id
        time
        current
        voltage
        power
      }
    }
  }
`;

const onCreateMyIotTable = /* GraphQL */ `
  subscription OnCreateMyIotTable {
    onCreateMyIotTable {
      device_id
      time
      current
      voltage
      power
    }
  }
`;

function App() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [minPower, setMinPower] = useState(0);
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    client
      .graphql({
        query: listMyIotTables,
        variables: { limit: 50 },
      })
      .then((res) => {
        const items = res.data.listMyIotTables.items || [];
        setRows(items.reverse());
      })
      .catch(console.error);

    const sub = client
      .graphql({ query: onCreateMyIotTable })
      .subscribe({
        next: ({ data }) => {
          const item = data.onCreateMyIotTable;
          setRows((prev) => [item, ...prev].slice(0, 50));
        },
        error: console.error,
      });

    return () => sub.unsubscribe();
  }, []);

  const normalizedRows = useMemo(() => {
    return rows
      .filter((r) => r && r.time)
      .map((r) => ({
        ...r,
        timeMs: new Date(r.time).getTime(),
      }))
      .sort((a, b) => a.timeMs - b.timeMs);
  }, [rows]);

  const deviceOptions = useMemo(() => {
    const set = new Set(normalizedRows.map((r) => r.device_id));
    return ["all", ...Array.from(set).sort((a, b) => a - b)];
  }, [normalizedRows]);

  const filteredRows = useMemo(() => {
    return normalizedRows.filter((r) => {
      const matchesDevice =
        deviceFilter === "all" || String(r.device_id) === deviceFilter;
      const matchesPower = Number(r.power) >= Number(minPower || 0);
      const matchesDate = dateFilter
        ? String(r.time || "").startsWith(dateFilter)
        : true;
      return matchesDevice && matchesPower && matchesDate;
    });
  }, [normalizedRows, deviceFilter, minPower, dateFilter]);

  const latest = filteredRows[filteredRows.length - 1];
  const avgPower = filteredRows.length
    ? Math.round(
        filteredRows.reduce((sum, r) => sum + (Number(r.power) || 0), 0) /
          filteredRows.length
      )
    : 0;
  const maxPower = filteredRows.reduce(
    (max, r) => Math.max(max, Number(r.power) || 0),
    0
  );

  const powerByDevice = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const key = String(r.device_id ?? "Unknown");
      const prev = map.get(key) || { device: key, count: 0, power: 0 };
      map.set(key, {
        device: key,
        count: prev.count + 1,
        power: prev.power + (Number(r.power) || 0),
      });
    });
    return Array.from(map.values()).map((r) => ({
      device: r.device,
      avgPower: r.count ? Math.round(r.power / r.count) : 0,
    }));
  }, [filteredRows]);

  const formatTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Live</p>
          <h1>IoT Energy Dashboard</h1>
          <p className="subtext">Real-time readings from AppSync</p>
        </div>
        <div className="badge">
          <span className="dot" />
          Streaming
        </div>
      </header>

      <section className="card-grid">
        <div className="card">
          <p className="card-label">Latest Power</p>
          <h2>{latest?.power ?? "-"} W</h2>
          <p className="card-sub">Device {latest?.device_id ?? "-"}</p>
        </div>
        <div className="card">
          <p className="card-label">Average Power</p>
          <h2>{avgPower} W</h2>
          <p className="card-sub">Across {filteredRows.length} readings</p>
        </div>
        <div className="card danger">
          <p className="card-label">Peak Power</p>
          <h2>{maxPower} W</h2>
          <p className="card-sub">Threshold: 1000 W</p>
        </div>
      </section>

      <section className="chart-grid">
        <div className="card">
          <h3>Power Over Time</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={filteredRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(v) => new Date(v).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleString()}
                />
                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>Average Power by Device</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={powerByDevice}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="device" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgPower" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <h3>Latest Readings</h3>
            <p className="subtext">Click any row for details</p>
          </div>
          <div className="filters">
            <div className="filter">
              <label>Device</label>
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
              >
                {deviceOptions.map((d) => (
                  <option key={d} value={d}>
                    {d === "all" ? "All" : `Device ${d}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter">
              <label>Min Power (W)</label>
              <input
                type="number"
                value={minPower}
                onChange={(e) => setMinPower(e.target.value)}
                min="0"
              />
            </div>
            <div className="filter">
              <label>Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Time</th>
                <th>Power</th>
                <th>Current</th>
                <th>Voltage</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredRows].reverse().map((r, i) => {
                const isHigh = Number(r.power) > 1000;
                return (
                  <tr
                    key={`${r.device_id}-${r.time}-${i}`}
                    className={isHigh ? "row-high" : "row-normal"}
                    onClick={() => setSelected(r)}
                  >
                    <td>{r.device_id}</td>
                    <td>{formatTime(r.time)}</td>
                    <td>{r.power}</td>
                    <td>{r.current}</td>
                    <td>{r.voltage}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reading Details</h3>
              <button className="close-btn" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div>
                  <p className="detail-label">Device</p>
                  <p className="detail-value">{selected.device_id}</p>
                </div>
                <div>
                  <p className="detail-label">Time</p>
                  <p className="detail-value">{formatTime(selected.time)}</p>
                </div>
                <div>
                  <p className="detail-label">Power</p>
                  <p
                    className={`detail-value ${
                      Number(selected.power) > 1000 ? "text-danger" : ""
                    }`}
                  >
                    {selected.power} W
                  </p>
                </div>
                <div>
                  <p className="detail-label">Current</p>
                  <p className="detail-value">{selected.current} A</p>
                </div>
                <div>
                  <p className="detail-label">Voltage</p>
                  <p className="detail-value">{selected.voltage} V</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
