import ChatWidget from "./components/ChatWidget.jsx";

export default function App() {
  return (
    <main className="app-shell">
      <section className="product-surface">
        <div className="product-copy">
          <span className="eyebrow">Standalone Assistant</span>
          <h1>AI Queue Guide Assistant</h1>
          <p>
            A reusable chatbot experience for queue operations, staff guidance,
            voice assistance, and future AI Queue integration.
          </p>
        </div>
      </section>
      <ChatWidget />
    </main>
  );
}
