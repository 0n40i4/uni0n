import { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('status');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/operator/status').then(r => r.json()).then(setStatus).catch(e => console.log(e));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#0a0a0a', color: '#e0e0e0', padding: '20px' }}>
      <h1 style={{ color: '#00ff41' }}>UNIONAI Operator Dashboard</h1>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {['status', 'relay', 'memory', 'incidents'].map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)} 
            style={{ padding: '8px 16px', background: activeTab === t ? '#00ff41' : '#333', color: activeTab === t ? '#000' : '#fff', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {activeTab === 'status' && status && (
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '3px' }}>
          <p>Status: {status.status}</p>
          <p>Relay Events: {status.relay_events}</p>
          <p>Memory Anchors: {status.memory_anchors}</p>
          <p>Open Incidents: {status.open_incidents}</p>
          <p>Redis: {status.redis_status}</p>
        </div>
      )}
      {activeTab === 'relay' && (
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '3px' }}>
          <button onClick={() => fetch('/api/operator/freeze-relay', {method: 'POST'})} style={{ padding: '10px 20px', background: '#ff6b6b', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '3px', marginRight: '10px' }}>
            Freeze Relay
          </button>
          <button onClick={() => fetch('/api/operator/unfreeze-relay', {method: 'POST'})} style={{ padding: '10px 20px', background: '#51cf66', color: '#000', border: 'none', cursor: 'pointer', borderRadius: '3px' }}>
            Unfreeze Relay
          </button>
        </div>
      )}
      {activeTab === 'memory' && (
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '3px' }}>
          <button onClick={() => fetch('/api/operator/freeze-memory', {method: 'POST'})} style={{ padding: '10px 20px', background: '#ff6b6b', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '3px', marginRight: '10px' }}>
            Freeze Memory
          </button>
          <button onClick={() => fetch('/api/operator/unfreeze-memory', {method: 'POST'})} style={{ padding: '10px 20px', background: '#51cf66', color: '#000', border: 'none', cursor: 'pointer', borderRadius: '3px' }}>
            Unfreeze Memory
          </button>
        </div>
      )}
      {activeTab === 'incidents' && (
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '3px' }}>
          <p>Incident management dashboard</p>
        </div>
      )}
    </div>
  );
}
