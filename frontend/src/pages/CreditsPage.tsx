import { useEffect, useState } from 'react';
import client from '../api/client';
import type { PlanItem, CreditTransactionItem } from '../types';

export default function CreditsPage() {
  const [balance, setBalance] = useState(0);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [transactions, setTransactions] = useState<CreditTransactionItem[]>([]);
  const [qrcode, setQrcode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get('/credits/balance').then(r => setBalance(r.data.balance)).catch(() => {});
    client.get('/credits/plans').then(r => setPlans(r.data)).catch(() => {});
    client.get('/credits/transactions?page_size=10').then(r => setTransactions(r.data.items)).catch(() => {});
  }, []);

  async function handleBuy(planId: string) {
    setLoading(true);
    try {
      const { data } = await client.post('/credits/order', { plan_id: planId });
      if (data.qrcode_url) setQrcode(data.qrcode_url);
    } catch { alert('创建订单失败'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">💰 积分中心</h1>
      <p className="text-gray-500 mb-8">当前积分: <span className="text-2xl font-bold text-indigo-600">{balance}</span></p>

      <h2 className="text-lg font-semibold mb-4">充值套餐</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition-shadow">
            <div className="text-xl font-bold text-gray-900 mb-1">{plan.name}</div>
            <div className="text-3xl font-bold text-indigo-600 mb-1">{plan.credits}</div>
            <div className="text-sm text-gray-500 mb-4">积分</div>
            <div className="text-lg font-semibold text-gray-700 mb-4">¥{(plan.amount_cents / 100).toFixed(0)}</div>
            <button onClick={() => handleBuy(plan.id)} disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? '处理中...' : '立即充值'}
            </button>
          </div>
        ))}
      </div>

      {qrcode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQrcode('')}>
          <div className="bg-white rounded-xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">扫码支付</h3>
            <img src={qrcode} alt="支付二维码" className="w-48 h-48 mx-auto mb-3" />
            <p className="text-sm text-gray-500">支付成功后积分自动到账</p>
            <button onClick={() => { setQrcode(''); window.location.reload(); }} className="mt-3 text-indigo-600 text-sm hover:underline">已完成支付</button>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">积分流水</h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr><th className="px-4 py-3 text-left text-gray-600">说明</th><th className="px-4 py-3 text-right text-gray-600">金额</th><th className="px-4 py-3 text-right text-gray-600">时间</th></tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-gray-700">{t.description}</td>
                <td className={`px-4 py-3 text-right font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>{t.amount > 0 ? '+' : ''}{t.amount}</td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">{new Date(t.created_at).toLocaleDateString('zh-CN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">暂无流水</div>}
      </div>
    </div>
  );
}
