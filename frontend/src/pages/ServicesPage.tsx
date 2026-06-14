import { useParams, useNavigate } from 'react-router-dom';
import ServiceTab from '../components/ServiceTab';
import FloatingChat from '../components/FloatingChat';

const TABS = [
  { key: 'dev', label: '外包开发', icon: '🛠️' },
  { key: 'teaching', label: '技术教学', icon: '🎓' },
  { key: 'devops', label: 'DevOps', icon: '🔧' },
  { key: 'consulting', label: '技术咨询', icon: '💡' },
];

export default function ServicesPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab = tab || 'dev';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-14 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => navigate(`/services/${t.key}`)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <ServiceTab tab={activeTab} />
      </div>

      <FloatingChat />
    </div>
  );
}
