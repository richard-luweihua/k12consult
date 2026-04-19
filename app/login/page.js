'use client';

import { Suspense, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiPath, appPath } from '@/lib/paths';
import { requiredFieldNames } from '@/lib/schema';
import { isPlaceholderConfig } from '@/lib/supabase';

const QUESTIONNAIRE_DRAFT_KEY = 'k12_questionnaire_draft_v2';
const QUESTIONNAIRE_PENDING_SUBMIT_KEY = 'k12_questionnaire_pending_submit_v2';

function resolveNextPath(rawNext) {
  if (typeof rawNext !== 'string') {
    return null;
  }

  const next = rawNext.trim();

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return null;
  }

  return next;
}

function LoginPageContent() {
  const [loginMethod, setLoginMethod] = useState('mobile');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [signUpMobile, setSignUpMobile] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState('');
  const [otpDebugCode, setOtpDebugCode] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, requestMobileOtp, verifyMobileOtp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveNextPath(searchParams.get('next'));
  const fallbackPath = appPath('/questionnaire');
  const redirectPath = nextPath || fallbackPath;

  const isDemoMode = isPlaceholderConfig();
  const isOtpVerifyStep = Boolean(otpChallengeId);

  const tryAutoSubmitPendingQuestionnaire = async (authenticatedUser) => {
    if (typeof window === 'undefined' || !authenticatedUser?.id) {
      return null;
    }

    const questionnairePathPrefix = appPath('/questionnaire');
    if (!nextPath || !nextPath.startsWith(questionnairePathPrefix)) {
      return null;
    }

    const raw = window.localStorage.getItem(QUESTIONNAIRE_PENDING_SUBMIT_KEY);
    if (!raw) {
      return null;
    }

    let pending;
    try {
      pending = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(QUESTIONNAIRE_PENDING_SUBMIT_KEY);
      return null;
    }

    const answers = pending?.answers && typeof pending.answers === 'object' ? pending.answers : null;
    if (!answers) {
      window.localStorage.removeItem(QUESTIONNAIRE_PENDING_SUBMIT_KEY);
      return null;
    }

    const hasMissing = requiredFieldNames.some((fieldName) => {
      const value = answers[fieldName];
      if (Array.isArray(value)) {
        return value.length === 0;
      }

      return typeof value === 'string' ? value.trim().length === 0 : !value;
    });

    if (hasMissing) {
      return null;
    }

    const tracking = pending?.tracking && typeof pending.tracking === 'object' ? pending.tracking : {};

    const response = await fetch(apiPath('/api/intake'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        ...answers,
        userId: authenticatedUser.id,
        tracking
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.submissionId) {
      throw new Error(payload?.message || '自动提交问卷失败');
    }

    window.localStorage.removeItem(QUESTIONNAIRE_PENDING_SUBMIT_KEY);
    window.localStorage.removeItem(QUESTIONNAIRE_DRAFT_KEY);
    return appPath(`/result/${payload.submissionId}/processing`);
  };

  const resolvePostLoginPath = async (authenticatedUser) => {
    try {
      const autoSubmitPath = await tryAutoSubmitPendingQuestionnaire(authenticatedUser);
      if (autoSubmitPath) {
        return autoSubmitPath;
      }
    } catch {
      // 自动提交失败时回退到常规 next 跳转，避免阻塞登录流程
    }

    if (nextPath) {
      return nextPath;
    }

    try {
      const response = await fetch(apiPath('/api/my-leads'), {
        credentials: 'include',
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload.ok !== false) {
        const leads = Array.isArray(payload.leads) ? payload.leads : [];
        return leads.length > 0 ? appPath('/dashboard') : fallbackPath;
      }
    } catch {
      // 网络异常时回退到问卷，保证新用户可继续主流程
    }

    return fallbackPath;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setHint('');
    setLoading(true);

    if (loginMethod === 'email' && isDemoMode) {
      // 演示模式：模拟登录成功
      setTimeout(() => {
        router.push(redirectPath);
      }, 1000);
      return;
    }

    try {
      if (loginMethod === 'mobile') {
        if (!isOtpVerifyStep) {
          const { data, error } = await requestMobileOtp(mobile, 'login');

          if (error) {
            throw error;
          }

          setOtpChallengeId(data.challengeId || '');
          setOtpExpiresAt(data.expiresAt || '');
          setHint(data.maskedMobile ? `验证码已发送至 ${data.maskedMobile}` : '验证码已发送');
          setOtpDebugCode(data.debugCode || '');
          return;
        }

        const { data, error } = await verifyMobileOtp({
          challengeId: otpChallengeId,
          mobile,
          code: otpCode
        });

        if (error) {
          throw error;
        }

        const postLoginPath = await resolvePostLoginPath(data?.user);
        router.push(postLoginPath);
      } else {
        if (isSignUp) {
          const { data, error } = await signUp(email, password, fullName, signUpMobile);
          if (error) throw error;
          const postLoginPath = await resolvePostLoginPath(data?.user);
          router.push(postLoginPath);
        } else {
          const { data, error } = await signIn(email, password);
          if (error) throw error;
          const postLoginPath = await resolvePostLoginPath(data?.user);
          router.push(postLoginPath);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipAuth = () => {
    // 跳过认证，直接进入应用
    router.push(redirectPath);
  };

  const switchMode = (mode) => {
    setLoginMethod(mode);
    setError('');
    setHint('');
    setOtpCode('');
    setOtpChallengeId('');
    setOtpExpiresAt('');
    setOtpDebugCode('');
  };

  return (
    <main className="login-v2-shell">
      <section className="login-v2-panel">
        <div className="login-v2-header">
          <p className="login-v2-brand">K12consult</p>
          <h1>{loginMethod === 'mobile' ? '手机号登录' : (isSignUp ? '创建账户' : '邮箱登录')}</h1>
          <p className="login-v2-subtitle">登录后可继续诊断、查看进展与管理案例。</p>
        </div>

        <div className="login-v2-switch" role="tablist" aria-label="登录方式">
          <button
            type="button"
            onClick={() => switchMode('mobile')}
            className={loginMethod === 'mobile' ? 'login-v2-switch-btn active' : 'login-v2-switch-btn'}
          >
            手机验证码
          </button>
          <button
            type="button"
            onClick={() => switchMode('email')}
            className={loginMethod === 'email' ? 'login-v2-switch-btn active' : 'login-v2-switch-btn'}
          >
            邮箱密码
          </button>
        </div>

        <form className="login-v2-form" onSubmit={handleSubmit}>
          {loginMethod === 'mobile' ? (
            <div className="login-v2-field-group">
              <input
                id="mobile"
                name="mobile"
                type="text"
                required
                className="login-v2-input"
                placeholder="手机号"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />

              {isOtpVerifyStep ? (
                <input
                  id="otp-code"
                  name="otpCode"
                  type="text"
                  required
                  className="login-v2-input"
                  placeholder="请输入验证码"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              ) : null}
            </div>
          ) : (
            <div className="login-v2-field-group">
              {isSignUp && (
                <>
                  <input
                    id="full-name"
                    name="fullName"
                    type="text"
                    required
                    className="login-v2-input"
                    placeholder="姓名"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <input
                    id="signup-mobile"
                    name="mobile"
                    type="text"
                    className="login-v2-input"
                    placeholder="手机号（选填，便于自动带入咨询意向）"
                    value={signUpMobile}
                    onChange={(e) => setSignUpMobile(e.target.value)}
                  />
                </>
              )}
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="login-v2-input"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="login-v2-input"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="login-v2-message login-v2-message--error">{error}</p>
          )}
          {hint ? (
            <p className="login-v2-message login-v2-message--success">{hint}</p>
          ) : null}
          {otpDebugCode ? (
            <p className="login-v2-message login-v2-message--debug">开发环境验证码：{otpDebugCode}</p>
          ) : null}
          {otpExpiresAt ? (
            <p className="login-v2-message login-v2-message--muted">
              验证码有效期至：{new Date(otpExpiresAt).toLocaleTimeString('zh-CN')}
            </p>
          ) : null}

          <button type="submit" disabled={loading} className="login-v2-submit">
            {loading
              ? '处理中...'
              : loginMethod === 'mobile'
                ? (isOtpVerifyStep ? '验证并登录' : '获取验证码')
                : (isSignUp ? '注册' : '登录')}
          </button>

          {loginMethod === 'mobile' && isOtpVerifyStep ? (
            <button
              type="button"
              onClick={() => {
                setOtpCode('');
                setOtpChallengeId('');
                setOtpExpiresAt('');
                setOtpDebugCode('');
                setHint('');
              }}
              className="login-v2-link-btn"
            >
              重新获取验证码
            </button>
          ) : null}

          {loginMethod === 'email' ? (
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="login-v2-link-btn">
              {isSignUp ? '已有账户？登录' : '没有账户？注册'}
            </button>
          ) : null}
        </form>

        {isDemoMode && (
          <div className="login-v2-demo">
            <p className="login-v2-demo-title">演示模式</p>
            <p>当前使用演示配置，无法连接到真实数据库服务。</p>
            <button onClick={handleSkipAuth} className="login-v2-demo-btn" type="button">
              跳过认证，直接体验
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="login-v2-shell">
          <section className="login-v2-panel">
            <div className="login-v2-header">
              <p className="login-v2-brand">K12consult</p>
              <h1>登录</h1>
              <p className="login-v2-subtitle">加载中...</p>
            </div>
          </section>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
