'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiPath, appPath } from '@/lib/paths';

const v2StatusLabelMap = {
  report_viewed: '报告已查看',
  consult_intent_submitted: '咨询意向已提交',
  admin_following: '管理员跟进中',
  awaiting_user_info: '待补资料',
  consult_ready_for_assignment: '可转顾问',
  consult_assigned: '顾问已接手',
  consult_scheduled: '咨询已排期',
  consult_completed: '咨询已完成',
  follow_up: '会后跟进中',
  nurturing: '培育阶段',
  closed: '已归档'
};

const missingInfoLabelMap = {
  academic_reports: '成绩单',
  standardized_scores: '标准化成绩',
  identity_proof: '身份证明',
  address_proof: '住址证明'
};

const reportTypeLabelMap = {
  ai_draft: 'AI 初稿',
  consultant_final: '顾问定稿'
};

function isInternalRole(role) {
  return ['consultant', 'admin', 'super_admin'].includes(role);
}

function resolveCurrentV2Status(lead) {
  return lead?.caseRecord?.status || lead?.adminFollowUpRecord?.status || 'report_viewed';
}

function statusLabel(status) {
  return v2StatusLabelMap[status] || status || '待处理';
}

function resolveLeadUpdatedAt(lead) {
  return (
    lead?.updatedAt ||
    lead?.updated_at ||
    lead?.caseRecord?.updatedAt ||
    lead?.adminFollowUpRecord?.updatedAt ||
    lead?.consultationRequest?.submittedAt ||
    lead?.createdAt ||
    lead?.created_at ||
    null
  );
}

function resolveLeadCreatedAt(lead) {
  return lead?.createdAt || lead?.created_at || lead?.questionnaireResponse?.submittedAt || null;
}

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDateTime(value) {
  if (!value) {
    return '待更新';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '待更新';
  }

  return date.toLocaleString('zh-CN');
}

function formatGrade(lead) {
  return lead?.grade || lead?.answers?.grade || lead?.student?.grade || '未填写';
}

function formatStudentName(lead) {
  return lead?.answers?.studentName || lead?.student?.name || '未命名学生';
}

function buildNextAction(lead) {
  const v2Status = resolveCurrentV2Status(lead);
  const resultHref = appPath(`/result/${lead.id}`);

  const fallback = {
    title: '继续查看当前案例进展',
    primaryLabel: '查看进展',
    primaryHref: resultHref
  };

  const actionByStatus = {
    report_viewed: {
      title: '你的诊断报告已生成，建议先提交咨询意向',
      primaryLabel: '提交咨询意向',
      primaryHref: resultHref,
      secondaryLabel: '查看报告',
      secondaryHref: resultHref
    },
    consult_intent_submitted: {
      title: '已收到你的意向，管理员正在跟进',
      primaryLabel: '查看进展',
      primaryHref: resultHref
    },
    admin_following: {
      title: '管理员正在与你确认信息',
      primaryLabel: '查看进展',
      primaryHref: resultHref
    },
    awaiting_user_info: {
      title: '需要你补充资料后继续推进',
      primaryLabel: '去补资料',
      primaryHref: resultHref
    },
    consult_ready_for_assignment: {
      title: '案例已满足转顾问条件',
      primaryLabel: '查看进展',
      primaryHref: resultHref
    },
    consult_assigned: {
      title: '顾问已接手，等待排期确认',
      primaryLabel: '查看咨询安排',
      primaryHref: resultHref
    },
    consult_scheduled: {
      title: '咨询已排期，请按时参加',
      primaryLabel: '查看咨询安排',
      primaryHref: resultHref
    },
    consult_completed: {
      title: '咨询已完成，可查看顾问结论',
      primaryLabel: '查看顾问结论',
      primaryHref: resultHref
    },
    follow_up: {
      title: '进入会后跟进阶段',
      primaryLabel: '查看跟进计划',
      primaryHref: resultHref
    },
    nurturing: {
      title: '当前进入培育阶段，后续将持续跟进',
      primaryLabel: '查看建议',
      primaryHref: resultHref
    },
    closed: {
      title: '当前案例已关闭',
      primaryLabel: '查看归档',
      primaryHref: resultHref
    }
  };

  return actionByStatus[v2Status] || fallback;
}

function buildReminderItems(lead) {
  const reminders = [];
  const v2Status = resolveCurrentV2Status(lead);
  const missingInfo = Array.isArray(lead?.adminFollowUpRecord?.missingInfo)
    ? lead.adminFollowUpRecord.missingInfo
    : [];
  const resultHref = appPath(`/result/${lead.id}`);

  if (v2Status === 'awaiting_user_info' && missingInfo.length > 0) {
    reminders.push({
      title: '补资料待完成',
      description: `当前待补：${missingInfo.map((item) => missingInfoLabelMap[item] || item).join('、')}`,
      dueAt: lead?.adminFollowUpRecord?.responseDueAt || lead?.adminFollowUpRecord?.dueAt || null,
      actionLabel: '去补资料',
      href: resultHref
    });
  }

  if (v2Status === 'consult_assigned') {
    reminders.push({
      title: '咨询时间待确认',
      description: '顾问已接手，请尽快确认可咨询时段。',
      dueAt: lead?.caseRecord?.consultationScheduledAt || null,
      actionLabel: '查看咨询安排',
      href: resultHref
    });
  }

  if (v2Status === 'follow_up') {
    reminders.push({
      title: '会后动作待确认',
      description: '请确认下一步执行计划，避免推进中断。',
      dueAt: lead?.caseRecord?.postConsultation?.nextStepDueAt || null,
      actionLabel: '查看跟进计划',
      href: resultHref
    });
  }

  return reminders.slice(0, 3);
}

function pushTimelineEvent(events, event) {
  if (!event?.title) {
    return;
  }

  events.push({
    id: event.id || `${event.title}-${event.time || 'none'}-${events.length}`,
    title: event.title,
    description: event.description || '',
    time: event.time || null
  });
}

function buildTimelineEvents(lead) {
  const events = [];
  const createdAt = resolveLeadCreatedAt(lead);
  const reportCreatedAt = lead?.currentReport?.createdAt || lead?.result?.currentReport?.createdAt || null;
  const consultationRequest = lead?.consultationRequest || {};
  const adminRecord = lead?.adminFollowUpRecord || {};
  const caseRecord = lead?.caseRecord || {};
  const v2Status = resolveCurrentV2Status(lead);
  const missingInfo = Array.isArray(adminRecord.missingInfo) ? adminRecord.missingInfo : [];
  const followUps = Array.isArray(lead?.followUps) ? lead.followUps : [];

  pushTimelineEvent(events, {
    id: 'questionnaire_submitted',
    title: '问卷提交',
    description: '已完成基础问卷信息填写。',
    time: createdAt
  });

  if (reportCreatedAt) {
    pushTimelineEvent(events, {
      id: 'report_generated',
      title: '报告生成',
      description: 'AI 诊断报告已生成。',
      time: reportCreatedAt
    });
  }

  if (consultationRequest.submittedAt) {
    pushTimelineEvent(events, {
      id: 'consultation_intent_submitted',
      title: '咨询意向提交',
      description: '已提交联系偏好与咨询诉求。',
      time: consultationRequest.submittedAt
    });
  }

  if (adminRecord.firstContactAt) {
    pushTimelineEvent(events, {
      id: 'admin_first_contact',
      title: '管理员已联系',
      description: '管理员已开始跟进该案例。',
      time: adminRecord.firstContactAt
    });
  }

  if (v2Status === 'awaiting_user_info' || missingInfo.length > 0) {
    pushTimelineEvent(events, {
      id: 'awaiting_user_info',
      title: '待补资料',
      description:
        missingInfo.length > 0
          ? `待补：${missingInfo.map((item) => missingInfoLabelMap[item] || item).join('、')}`
          : '管理员正在等待你补充资料。',
      time: adminRecord.updatedAt
    });
  }

  if (adminRecord.userSupplement?.submittedAt) {
    pushTimelineEvent(events, {
      id: 'supplemental_info_submitted',
      title: '补资料已提交',
      description: '补充资料已回填，等待管理员确认。',
      time: adminRecord.userSupplement.submittedAt
    });
  }

  if (['consult_assigned', 'consult_scheduled', 'consult_completed', 'follow_up', 'closed'].includes(v2Status)) {
    pushTimelineEvent(events, {
      id: 'consultant_assigned',
      title: '顾问分配',
      description: `顾问：${lead?.assignment?.consultantName || caseRecord.assignedConsultantName || '待确认'}`,
      time: caseRecord.assignedAt || caseRecord.updatedAt || resolveLeadUpdatedAt(lead)
    });
  }

  if (caseRecord.consultationScheduledAt) {
    pushTimelineEvent(events, {
      id: 'consultation_scheduled',
      title: '咨询已排期',
      description: '请按预约时间参与咨询。',
      time: caseRecord.consultationScheduledAt
    });
  }

  if (caseRecord.consultationCompletedAt) {
    pushTimelineEvent(events, {
      id: 'consultation_completed',
      title: '咨询已完成',
      description: '顾问结论已生成。',
      time: caseRecord.consultationCompletedAt
    });
  }

  if (caseRecord.postConsultation?.summary || caseRecord.postConsultation?.nextStep) {
    pushTimelineEvent(events, {
      id: 'post_consultation_follow_up',
      title: '会后跟进',
      description: caseRecord.postConsultation.summary || '已进入会后跟进阶段。',
      time: caseRecord.postConsultation.updatedAt || caseRecord.updatedAt
    });
  }

  if (caseRecord.closure?.closedAt || v2Status === 'closed') {
    pushTimelineEvent(events, {
      id: 'case_closed',
      title: '案例已关闭',
      description: caseRecord.closure?.reason || '该案例已进入归档状态。',
      time: caseRecord.closure?.closedAt || caseRecord.updatedAt || resolveLeadUpdatedAt(lead)
    });
  }

  for (const item of followUps.slice(0, 4)) {
    pushTimelineEvent(events, {
      id: item.id,
      title: item.author ? `${item.author} 跟进记录` : '跟进记录',
      description: item.note || '',
      time: item.createdAt
    });
  }

  events.sort((left, right) => toTimestamp(right.time) - toTimestamp(left.time));
  return events.slice(0, 8);
}

function buildReportHistory(lead) {
  const versions = [];

  if (lead?.currentReport) {
    versions.push(lead.currentReport);
  }

  if (Array.isArray(lead?.reportVersions)) {
    versions.push(...lead.reportVersions);
  }

  const uniqueByKey = new Map();
  for (const report of versions) {
    if (!report) {
      continue;
    }

    const key = `${report.reportVersion || 'none'}-${report.reportType || 'unknown'}-${report.createdAt || 'none'}`;
    if (!uniqueByKey.has(key)) {
      uniqueByKey.set(key, report);
    }
  }

  return [...uniqueByKey.values()].sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [activeLeadId, setActiveLeadId] = useState('');

  const sortedLeads = useMemo(() => {
    return [...leads].sort((left, right) => toTimestamp(resolveLeadUpdatedAt(right)) - toTimestamp(resolveLeadUpdatedAt(left)));
  }, [leads]);

  const activeLead = useMemo(() => {
    if (sortedLeads.length === 0) {
      return null;
    }

    return sortedLeads.find((item) => item.id === activeLeadId) || sortedLeads[0];
  }, [sortedLeads, activeLeadId]);

  const nextAction = activeLead ? buildNextAction(activeLead) : null;
  const reminders = activeLead ? buildReminderItems(activeLead) : [];
  const timelineEvents = activeLead ? buildTimelineEvents(activeLead) : [];
  const reports = activeLead ? buildReportHistory(activeLead) : [];

  useEffect(() => {
    if (!authLoading && !user) {
      const next = encodeURIComponent(appPath('/dashboard'));
      router.replace(appPath(`/login?next=${next}`));
      return;
    }

    if (!authLoading && user && user.role === 'consultant') {
      router.replace(appPath('/advisor'));
      return;
    }

    if (!authLoading && user && ['admin', 'super_admin'].includes(user.role)) {
      router.replace(appPath('/admin'));
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (sortedLeads.length === 0) {
      setActiveLeadId('');
      return;
    }

    if (!activeLeadId || !sortedLeads.some((item) => item.id === activeLeadId)) {
      setActiveLeadId(sortedLeads[0].id);
    }
  }, [sortedLeads, activeLeadId]);

  useEffect(() => {
    if (authLoading || !user || isInternalRole(user.role)) {
      return;
    }

    let cancelled = false;

    async function fetchMyLeads() {
      setLoadingLeads(true);
      setLoadError('');

      try {
        const response = await fetch(apiPath('/api/my-leads'), {
          credentials: 'include',
          cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({}));

        if (response.status === 401) {
          const next = encodeURIComponent(appPath('/dashboard'));
          router.replace(appPath(`/login?next=${next}`));
          return;
        }

        if (!response.ok || payload.ok === false) {
          throw new Error(payload.message || '读取案例失败');
        }

        if (!cancelled) {
          setLeads(Array.isArray(payload.leads) ? payload.leads : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLeads([]);
          setLoadError(error instanceof Error ? error.message : '读取案例失败');
        }
      } finally {
        if (!cancelled) {
          setLoadingLeads(false);
        }
      }
    }

    fetchMyLeads();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router, reloadTick]);

  if (authLoading || (user && !isInternalRole(user.role) && loadingLeads)) {
    return (
      <div className="auth-shell">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!user || isInternalRole(user.role)) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace(appPath('/login'));
  };

  return (
    <main className="page-shell home-shell parent-dashboard-shell">
      <section className="card parent-dashboard-header">
        <div>
          <p className="eyebrow">Parent Dashboard</p>
          <h1>{user.full_name || user.email || '家长用户'}，欢迎回来</h1>
          <p className="hero-text">继续诊断或查看服务进展，系统会把你当前最重要的下一步放在最上方。</p>
        </div>
        <div className="page-topbar-actions">
          <Link className="secondary-button" href={appPath('/questionnaire')}>
            开始新诊断
          </Link>
          <a className="secondary-button" href="mailto:service@k12consult.hk">
            联系客服
          </a>
          <button className="secondary-button" type="button" onClick={handleSignOut}>
            退出登录
          </button>
        </div>
      </section>

      <section className="card parent-section-card">
        <div className="parent-section-head">
          <div>
            <p className="eyebrow">Next Action</p>
            <h2>下一步建议</h2>
          </div>
          {activeLead ? (
            <span className="status-pill">{statusLabel(resolveCurrentV2Status(activeLead))}</span>
          ) : null}
        </div>

        {!activeLead ? (
          <div className="parent-empty-state">
            <p>暂无案例，先完成一份诊断问卷，我们会自动生成你的第一版报告。</p>
            <Link className="primary-button" href={appPath('/questionnaire')}>
              开始诊断
            </Link>
          </div>
        ) : (
          <div className="parent-next-action-main">
            <h3>{nextAction.title}</h3>
            <p className="inline-note">
              当前案例：{formatStudentName(activeLead)} · 最近更新：{formatDateTime(resolveLeadUpdatedAt(activeLead))}
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href={nextAction.primaryHref}>
                {nextAction.primaryLabel}
              </Link>
              {nextAction.secondaryLabel && nextAction.secondaryHref ? (
                <Link className="secondary-button" href={nextAction.secondaryHref}>
                  {nextAction.secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="card parent-section-card">
        <div className="parent-section-head">
          <div>
            <p className="eyebrow">To-Do</p>
            <h2>待办与提醒</h2>
          </div>
        </div>

        {!activeLead || reminders.length === 0 ? (
          <p className="inline-note">当前没有阻塞推进的待办事项。</p>
        ) : (
          <div className="parent-reminder-list">
            {reminders.map((item) => (
              <article className="parent-reminder-item" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="parent-reminder-meta">
                  <span>{item.dueAt ? `截止时间：${formatDateTime(item.dueAt)}` : '建议尽快处理'}</span>
                  <Link className="secondary-button" href={item.href}>
                    {item.actionLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {loadError ? (
        <section className="card parent-section-card">
          <div className="parent-empty-state">
            <p>读取案例失败：{loadError}</p>
            <button className="secondary-button" type="button" onClick={() => setReloadTick((prev) => prev + 1)}>
              重试
            </button>
          </div>
        </section>
      ) : null}

      <section className="card parent-section-card">
        <div className="parent-section-head">
          <div>
            <p className="eyebrow">My Cases</p>
            <h2>我的案例</h2>
          </div>
          <span className="inline-note">共 {sortedLeads.length} 个</span>
        </div>

        {sortedLeads.length === 0 ? (
          <p className="inline-note">还没有可查看的案例，完成问卷后会自动出现在这里。</p>
        ) : (
          <div className="parent-case-list">
            {sortedLeads.map((lead) => {
              const isActive = activeLead?.id === lead.id;
              const leadStatus = resolveCurrentV2Status(lead);
              return (
                <article className={isActive ? 'parent-case-item active' : 'parent-case-item'} key={lead.id}>
                  <div className="parent-case-head">
                    <h3>{formatStudentName(lead)}</h3>
                    <span className="status-pill">{statusLabel(leadStatus)}</span>
                  </div>

                  <div className="parent-case-grid">
                    <p className="parent-case-meta">年级：{formatGrade(lead)}</p>
                    <p className="parent-case-meta">
                      推荐顾问：{lead?.assignment?.consultantName || lead?.caseRecord?.assignedConsultantName || '待分配'}
                    </p>
                    <p className="parent-case-meta">最近更新时间：{formatDateTime(resolveLeadUpdatedAt(lead))}</p>
                    <p className="parent-case-meta">案例 ID：{lead.id.slice(0, 8)}</p>
                  </div>

                  <div className="parent-actions">
                    <button className="secondary-button" type="button" onClick={() => setActiveLeadId(lead.id)}>
                      {isActive ? '当前案例' : '切换到此案例'}
                    </button>
                    <Link className="secondary-button" href={appPath(`/result/${lead.id}`)}>
                      查看详情
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card parent-section-card">
        <div className="parent-section-head">
          <div>
            <p className="eyebrow">Timeline</p>
            <h2>最近案例进展</h2>
          </div>
        </div>

        {!activeLead || timelineEvents.length === 0 ? (
          <p className="inline-note">当前案例暂无进展记录。</p>
        ) : (
          <div className="parent-timeline-list">
            {timelineEvents.map((item) => (
              <article className="parent-timeline-item" key={item.id}>
                <p className="parent-timeline-time">{formatDateTime(item.time)}</p>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description || '已更新案例进展。'}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card parent-section-card">
        <div className="parent-section-head">
          <div>
            <p className="eyebrow">Reports</p>
            <h2>历史报告</h2>
          </div>
        </div>

        {!activeLead || reports.length === 0 ? (
          <p className="inline-note">当前案例暂无可查看的报告版本。</p>
        ) : (
          <div className="parent-report-list">
            {reports.map((report, index) => (
              <article className="parent-report-item" key={`${report.reportVersion || 'none'}-${report.createdAt || index}`}>
                <div className="parent-report-meta">
                  <span className="status-pill">{reportTypeLabelMap[report.reportType] || report.reportType || '报告版本'}</span>
                  <span className="inline-note">{formatDateTime(report.createdAt)}</span>
                </div>
                <p className="parent-case-meta">版本号：{report.reportVersion || index + 1}</p>
                <Link className="secondary-button" href={appPath(`/result/${activeLead.id}`)}>
                  打开报告
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
