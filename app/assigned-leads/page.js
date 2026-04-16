'use client';

import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { isPlaceholderConfig } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function getStatusMeta(status) {
  const labelMap = {
    completed: '已完成',
    in_progress: '进行中',
    pending: '待处理',
    待派单: '待派单',
    已派单: '已派单',
    顾问已接收: '顾问已接收',
    跟进中: '跟进中',
    已转化: '已转化'
  };

  const toneMap = {
    completed: 'bg-green-100 text-green-800',
    已完成: 'bg-green-100 text-green-800',
    已转化: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    进行中: 'bg-yellow-100 text-yellow-800',
    跟进中: 'bg-yellow-100 text-yellow-800',
    顾问已接收: 'bg-blue-100 text-blue-800',
    已派单: 'bg-blue-100 text-blue-800',
    待派单: 'bg-gray-100 text-gray-800',
    pending: 'bg-gray-100 text-gray-800'
  };

  return {
    label: labelMap[status] || status || '待处理',
    tone: toneMap[status] || 'bg-gray-100 text-gray-800'
  };
}

export default function AssignedLeadsPage() {
  const { user } = useAuth();
  const { canViewAssignedLeads, isConsultant } = usePermissions();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !canViewAssignedLeads || !isConsultant) return;

    const fetchAssignedLeads = async () => {
      // 演示模式：返回模拟数据
      if (isPlaceholderConfig()) {
        setLeads([
          {
            id: 'demo-assigned-1',
            consultant_id: user.id,
            full_name: '分配示例1',
            grade: '12年级',
            source_channel: 'direct',
            status: '跟进中',
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'demo-assigned-2',
            consultant_id: user.id,
            full_name: '分配示例2',
            grade: '11年级',
            source_channel: 'event',
            status: '已派单',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/assigned-leads', {
        credentials: 'include',
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        console.error('Error fetching assigned leads:', payload.message);
        setLeads([]);
      } else {
        setLeads(payload.leads || []);
      }
      setLoading(false);
    };

    fetchAssignedLeads();
  }, [user, canViewAssignedLeads, isConsultant]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!isConsultant || !canViewAssignedLeads) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">无权限访问</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
                ← 返回仪表板
              </Link>
              <h1 className="ml-4 text-2xl font-bold text-gray-900">分配线索</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {leads.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无分配线索</h3>
              <p className="mt-1 text-sm text-gray-500">目前没有分配给您的咨询线索。</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <li key={lead.id}>
                    {(() => {
                      const statusMeta = getStatusMeta(lead.status);

                      return (
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            线索 #{lead.id.slice(0, 8)}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMeta.tone}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="text-sm text-gray-500">
                            {new Date(lead.created_at || lead.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            年级: {lead.grade || '未指定'}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            优先级: {lead.priority || '普通'}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            来源: {lead.channelLabel || lead.effectiveChannel || lead.effective_channel || '未知'}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm sm:mt-0">
                          <Link
                            href={`/advisor/leads/${lead.id}`}
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            处理线索 →
                          </Link>
                        </div>
                      </div>
                    </div>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
