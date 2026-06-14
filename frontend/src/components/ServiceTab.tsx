interface ServiceData {
  icon: string;
  title: string;
  subtitle: string;
  features: string[];
  techStack?: string[];
  price: string;
  priceLabel?: string;
}

const SERVICES: Record<string, ServiceData> = {
  dev: {
    icon: '🛠️',
    title: '外包开发',
    subtitle: '全栈开发经验，从需求分析到上线交付，一站式技术服务。',
    features: ['Web 应用开发', '微信小程序开发', 'RESTful API 设计与开发', '管理后台系统', '数据库设计与优化'],
    techStack: ['React', 'Vue', 'FastAPI', 'Node.js', 'PostgreSQL', 'Docker'],
    price: '¥5,000 起',
    priceLabel: '按项目复杂度评估，交付周期 2-8 周',
  },
  teaching: {
    icon: '🎓',
    title: '技术教学',
    subtitle: '1v1 个性化辅导，从入门到就业，量身定制学习路径。',
    features: ['Python 后端开发', 'React 前端开发', '技术面试辅导', '项目实战指导', '代码 Review 与改进'],
    price: '¥300/小时',
    priceLabel: '支持线上远程教学，时间灵活预约',
  },
  devops: {
    icon: '🔧',
    title: 'DevOps 服务',
    subtitle: '让你的应用稳定、安全、可扩展。',
    features: ['Docker 容器化部署', 'CI/CD 流水线搭建', '云服务器部署与运维', '监控告警系统', '数据库性能优化'],
    techStack: ['Docker', 'Kubernetes', 'GitHub Actions', 'Nginx', 'AWS/阿里云'],
    price: '联系报价',
    priceLabel: '根据项目规模和需求定制方案',
  },
  consulting: {
    icon: '💡',
    title: '技术咨询',
    subtitle: '帮你做对技术决策，少走弯路，加速产品落地。',
    features: ['系统架构评审', '性能瓶颈诊断与优化', '技术选型建议', '代码质量审查', '安全漏洞评估'],
    price: '联系报价',
    priceLabel: '按咨询深度和时长灵活计费',
  },
};

interface Props {
  tab: string;
}

export default function ServiceTab({ tab }: Props) {
  const service = SERVICES[tab] || SERVICES.dev;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-12 px-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl mb-8">
        <div className="text-5xl mb-4">{service.icon}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{service.title}</h1>
        <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">{service.subtitle}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">服务内容</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {service.features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500 shrink-0">✓</span>
              {f}
            </div>
          ))}
        </div>

        {service.techStack && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-3">技术栈</h4>
            <div className="flex flex-wrap gap-2">
              {service.techStack.map((t) => (
                <span key={t} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white text-center">
        <div className="text-3xl font-bold mb-2">{service.price}</div>
        {service.priceLabel && (
          <p className="text-indigo-200 text-sm mb-6">{service.priceLabel}</p>
        )}
        <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors">
          💬 立即咨询
        </button>
      </div>
    </div>
  );
}
