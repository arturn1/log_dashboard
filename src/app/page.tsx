'use client';
import React, { useEffect, useState, useRef } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface LogData {
  action: "start" | "finished" | "error";
  actionId: string;
  userId: string;
  session: string;
  method: string;
  ip?: string;
  route?: string;
  statusCode?: number;
  duration: number;
  time?: string;
}

const Home: React.FC = () => {
  const [logs, setLogs] = useState<LogData[]>([]);
  const [ongoingActions, setOngoingActions] = useState<LogData[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    socketRef.current = new WebSocket("ws://localhost:7075/logs");

    socketRef.current.onopen = () => {
      console.log("WebSocket connected.");
    };

    socketRef.current.onmessage = (event) => {
      try {
        const log: LogData = JSON.parse(event.data);
        console.log(log);

        setLogs((prevLogs) => [...prevLogs, log].slice(-1000)); // Mantém os últimos 1000 logs

        if (log.action === "finished" || log.action === "error") {
          setOngoingActions((prev) =>
            prev.filter((ongoing) => ongoing.actionId !== log.actionId)
          ); // Remove ação finalizada ou com erro
        } else if (log.action === "start") {
          setOngoingActions((prev) => [...prev, log]); // Adiciona ação em execução
        }
      } catch (error) {
        console.error("Failed to parse log data:", error);
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socketRef.current?.close();
    };
  }, []);

  const calculateMetrics = () => {
    // Filtrar logs que sejam "finished" ou "error"
    const relevantLogs = logs.filter((log) => log.action === "finished" || log.action === "error");

    const totalRequests = relevantLogs.length;

    const averageDuration =
      relevantLogs.length > 0
        ? relevantLogs.reduce((sum, log) => sum + log.duration, 0) / relevantLogs.length
        : 0;

    const requestsByMethod = logs.reduce((acc: Record<string, number>, log) => {
      acc[log.method] = (acc[log.method] || 0) + 1;
      return acc;
    }, {});

    const statusDistribution = logs.reduce((acc: Record<string, number>, log) => {
      if (log.statusCode) {
        acc[log.statusCode] = (acc[log.statusCode] || 0) + 1;
      }
      return acc;
    }, {});

    return { totalRequests, averageDuration, requestsByMethod, statusDistribution, relevantLogs };
  };

  const metrics = calculateMetrics();

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>Log Dashboard</h1>

      <div style={{ marginBottom: "20px" }}>
        <h2>Métricas</h2>
        <p>Total de Requisições: {metrics.totalRequests}</p>
        <p>Duração Média: {metrics.averageDuration.toFixed(2)}ms</p>
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
      <div style={{ marginBottom: "20px", width: "49%" }}>
        <h2>Ações em Execução</h2>
        <div
          style={{
            maxHeight: "200px",
            overflowY: "scroll",
            border: "1px solid #ddd",
            padding: "10px",
            backgroundColor: "#f9f9f9",
          }}
        >
          {ongoingActions.length > 0 ? (
            ongoingActions.map((action, index) => (
              <div key={index}>
                {action.actionId} - {action.action} - {action.method} - {action.route} - {action.statusCode || "N/A"} -{" "}
                {action.session || "Anonynous"}
              </div>
            ))
          ) : (
            <p>Nenhuma ação em execução no momento.</p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "20px", width: "49%" }}>
        <h2>Logs em Tempo Real</h2>
        <div
          style={{
            maxHeight: "200px",
            overflowY: "scroll",
            border: "1px solid #ddd",
            padding: "10px",
            backgroundColor: "#f9f9f9",
          }}
          ref={(el) => {
            if (el) {
              el.scrollTop = el.scrollHeight;
            }
          }}
        >
          {logs.slice(-50).map((log, index) => (
            <div key={index}>
              {log.actionId.slice(-12)} - {log.action} - {log.method} - {log.route} -{" "}
              {log.statusCode || "N/A"} - {log.session || "Anonynous"} - {log.time}
            </div>
          ))}
        </div>
      </div>;

      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ width: "30%" }}>
          <h3>Requisições por Método</h3>
          <Bar
            data={{
              labels: Object.keys(metrics.requestsByMethod),
              datasets: [
                {
                  label: "Métodos",
                  data: Object.values(metrics.requestsByMethod),
                  backgroundColor: "rgba(75, 192, 192, 0.2)",
                  borderColor: "rgba(75, 192, 192, 1)",
                  borderWidth: 1,
                },
              ],
            }}
          />
        </div>

        <div style={{ width: "30%" }}>
          <h3>Status Codes</h3>
          <Pie
            data={{
              labels: Object.keys(metrics.statusDistribution),
              datasets: [
                {
                  label: "Status Codes",
                  data: Object.values(metrics.statusDistribution),
                  backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
                },
              ],
            }}
          />
        </div>

        <div style={{ width: "30%" }}>
          <h3>Duração por Requisição</h3>
          <Line
            data={{
              labels: metrics.relevantLogs.map((log) => log.route), // Identificadores no eixo X
              datasets: [
                {
                  label: "Duração (ms)",
                  data: metrics.relevantLogs.map((log) => log.duration), // Valores no eixo Y
                  borderColor: "rgba(255, 99, 132, 1)",
                  backgroundColor: "rgba(255, 99, 132, 0.2)",
                  tension: 0.4,
                },
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
