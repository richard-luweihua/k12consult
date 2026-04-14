import Link from "next/link";
import { Suspense } from "react";
import { AttributionLink } from "../components/AttributionLink";

const capabilities = [
  {
    index: "01",
    eyebrow: "Pathway Diagnosis",
    title: "把“适合哪条升学路径”先判断清楚。",
    text: "基于年级、语言基础、预算、身份条件与推进窗口，先输出可执行路径，而不是先把家长拖进冗长咨询。"
  },
  {
    index: "02",
    eyebrow: "Risk Framing",
    title: "把主要风险点和推进顺序提前讲清楚。",
    text: "系统会同时产出综合评级、主要风险点与下一步动作建议，让家长先看到真正影响决策的变量。"
  },
  {
    index: "03",
    eyebrow: "Decision Clarity",
    title: "把含糊咨询变成更清晰的判断结果。",
    text: "从问卷提交到结果生成保持同一套逻辑，让每个家庭都先拿到可理解、可行动的初步建议。"
  }
];

const engagementFlow = [
  {
    step: "Discover",
    title: "落地页先建立判断框架",
    text: "先解释这份前诊解决什么问题，让家长理解这不是“泛泛咨询”，而是一次结构化判断。"
  },
  {
    step: "Diagnose",
    title: "8-12 分钟完成前诊问卷",
    text: "围绕学业、语言、预算、身份与节奏抓关键变量，不做冗余问题堆砌。"
  },
  {
    step: "Route",
    title: "即时生成结果与下一步建议",
    text: "系统同步输出路径初判、风险提示与后续建议，让家庭先看到一份成体系的结论。"
  }
];

const deliverables = [
  "用户端：咨询级落地页、结构化前诊问卷、固定模板结果页",
  "结果层：路径初判、风险提示、下一步建议",
  "运营层：企业微信通知、渠道归因、活动统计",
  "服务层：统一口径、统一流程、统一数据沉淀"
];

export default function HomePage() {
  return (
    <main className="page-shell home-shell">
      <section className="hero hero--executive">
        <div className="hero-copy">
          <p className="eyebrow">K12 Advisory Intake System</p>
          <h1>先把判断做专业，再把转化做规模。</h1>
          <p className="hero-text">
            为香港 K12 择校咨询搭建一套更像咨询公司的前诊入口。它不是单纯的表单工具，而是一套把家庭信息、路径判断、
            顾问分诊与后续跟进串起来的结构化工作流。
          </p>
          <div className="hero-actions">
            <Suspense
              fallback={
                <Link className="primary-button large" href="/questionnaire">
                  开始前诊
                </Link>
              }
            >
              <AttributionLink className="primary-button large" href="/questionnaire">
                开始前诊
              </AttributionLink>
            </Suspense>
          </div>
        </div>

        <div className="hero-panel hero-panel--executive">
          <div className="hero-panel-block">
            <span className="hero-kicker">Executive Summary</span>
            <h3>把“是否值得推进、先怎么推进、由谁来接”放到一次前诊里完成。</h3>
          </div>

          <div className="metric-row metric-row--executive">
            <div>
              <strong>8-12 分钟</strong>
              <span>完成问卷并生成结果</span>
            </div>
            <div>
              <strong>4 维评分</strong>
              <span>紧迫度 / 预算 / 意向 / 复杂度</span>
            </div>
            <div>
              <strong>1 条闭环</strong>
              <span>结果页、后续建议与服务联系统一串联</span>
            </div>
          </div>

          <div className="hero-note hero-note--executive">
            <p>Recommended Positioning</p>
            <h3>For families who need an early but rigorous view of their Hong Kong K12 options.</h3>
            <span>更像一次咨询公司式 intake，而不是一次普通留资。</span>
          </div>
        </div>
      </section>

      <section className="trust-strip card">
        <div>
          <span>咨询式判断</span>
          <span>结构化问卷</span>
          <span>自动评级</span>
          <span>结果生成</span>
        </div>
        <p>用户界面现在只保留前诊与结果体验，内部协作流程不会再直接呈现在家长面前。</p>
      </section>

      <section className="section-block">
        <div className="section-intro">
          <p className="eyebrow">What The System Does</p>
          <h2>它解决的不是“信息收集”，而是咨询团队最容易失真的前段判断。</h2>
        </div>
        <div className="three-column capability-grid">
          {capabilities.map((item) => (
            <article className="card capability-card" key={item.index}>
              <span className="capability-index">{item.index}</span>
              <p className="eyebrow">{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block narrative-grid">
        <article className="card narrative-card narrative-card--dark">
          <p className="eyebrow">Operating Principle</p>
          <h2>先做框架化判断，再进入人工细化。</h2>
          <p>
            麦肯锡式前端页面的核心，不是把页面做得很花，而是让访客迅速理解：这个团队有方法、有结构、有结论，而不是只会把问题抛回给客户。
          </p>
        </article>

        <article className="card narrative-card">
          <p className="eyebrow">Output Design</p>
          <h2>每次提交都必须留下“可被执行的下一步”。</h2>
          <p>
            所以前诊结果不只给路径名称，还要给风险点、优先级和后续动作，让家庭看到的是一份有结构的初步判断。
          </p>
        </article>
      </section>

      <section className="section-block">
        <div className="section-intro">
          <p className="eyebrow">Engagement Flow</p>
          <h2>从内容触达到顾问接手，页面结构本身就在传达“专业流程”。</h2>
        </div>
        <div className="timeline-list timeline-list--executive">
          {engagementFlow.map((item, index) => (
            <article className="card timeline-item timeline-item--executive" key={item.step}>
              <div className="timeline-index-wrap">
                <span className="timeline-index">0{index + 1}</span>
                <small>{item.step}</small>
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-intro">
          <p className="eyebrow">Deliverables</p>
          <h2>这不是单页设计优化，而是一套把用户获取和内部协作彻底分开的交付。</h2>
        </div>
        <div className="deliverable-grid">
          {deliverables.map((item) => (
            <article className="card deliverable-card" key={item}>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block dual-panel">
        <article className="card outcome-card">
          <p className="eyebrow">For Families</p>
          <h3>更快知道方向是否成立，而不是先进入反复沟通。</h3>
          <ul className="plain-list">
            <li>先判断是本地、国际还是过渡路径更合适</li>
            <li>把预算、时间窗口、身份和适应风险说清楚</li>
            <li>获得一套更像正式咨询结论的结果页</li>
          </ul>
        </article>

        <article className="card outcome-card outcome-card--accent">
          <p className="eyebrow">For Service Teams</p>
          <h3>前端判断先统一，后续沟通才能更聚焦。</h3>
          <ul className="plain-list">
            <li>统一前诊字段，减少重复提问</li>
            <li>让后续沟通更快进入重点</li>
            <li>把服务口径和线索记录持续沉淀</li>
          </ul>
        </article>
      </section>

      <section className="card cta-panel cta-panel--executive">
        <div>
          <p className="eyebrow">Next Step</p>
          <h2>先完成一份真实前诊，看看这套结构化判断是否符合你的服务预期。</h2>
          <p>用户端现在只展示家长真正需要看到的内容，让前诊体验更完整、更专业，也更接近正式咨询服务。</p>
        </div>
        <div className="hero-actions">
          <Suspense
            fallback={
              <Link className="primary-button" href="/questionnaire">
                立即体验问卷
              </Link>
            }
          >
            <AttributionLink className="primary-button" href="/questionnaire">
              立即体验问卷
            </AttributionLink>
          </Suspense>
        </div>
      </section>
    </main>
  );
}
