// ============================================================
// Agentic OS X — Agent Runtime with Lazy Loading & DNA System
// ============================================================
import type {
  ExtendedAgentType,
  AgentStatus,
  AgentConfig,
  AgentMessage,
  AgentDNA,
  AgentMemory,
  AgentCategory,
  AgentDescriptor,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { modelRouter } from './model-router';

// ─── Agent Categories ─────────────────────────────────────────
const AGENT_CATEGORIES: Record<ExtendedAgentType, AgentCategory> = {
  // Core (mapped to closest category)
  planner: 'executive',
  architect: 'engineering',
  researcher: 'research',
  coder: 'engineering',
  reviewer: 'engineering',
  verifier: 'engineering',
  memory: 'knowledge',
  // Engineering
  devops: 'engineering',
  security: 'security',
  testing: 'engineering',
  uiux: 'engineering',
  seo: 'business',
  database: 'engineering',
  documentation: 'engineering',
  deployment: 'engineering',
  // Executive
  ceo: 'executive',
  cto: 'executive',
  product_manager: 'executive',
  // Engineering (additional)
  backend: 'engineering',
  frontend: 'engineering',
  fullstack: 'engineering',
  cloud: 'engineering',
  code_review: 'engineering',
  // Research
  fact_verification: 'research',
  market_intelligence: 'research',
  competitor_analysis: 'research',
  // Business
  automation: 'automation',
  business: 'business',
  recruitment: 'business',
  hr: 'business',
  crm: 'business',
  sales: 'business',
  marketing: 'business',
  content: 'business',
  // Data
  data_analyst: 'data',
  etl: 'data',
  bi: 'data',
  reporting: 'data',
  // Knowledge
  knowledge: 'knowledge',
  rag: 'knowledge',
  graph: 'knowledge',
  // Security (additional)
  audit: 'security',
  compliance: 'security',
  threat_detection: 'security',
  // Automation (additional)
  workflow: 'automation',
  scheduler: 'automation',
  integration: 'automation',
  // Platform
  github: 'platform',
  docker: 'platform',
  kubernetes: 'platform',
  cloudflare: 'platform',
  wordpress: 'platform',
  moodle: 'platform',
  // AI
  prompt_engineering: 'ai',
  model_optimization: 'ai',
  swarm_optimization: 'ai',
  brain_optimization: 'ai',
  // Multimodal
  voice: 'multimodal',
  vision: 'multimodal',
  meeting: 'multimodal',
  browser: 'multimodal',
  computer_use: 'multimodal',
  // Industry
  aviation: 'industry',
  airline_recruitment: 'industry',
  aviation_training: 'industry',
  financial_analysis: 'industry',
  legal_research: 'industry',
  procurement: 'industry',
  customer_success: 'industry',
  strategic_planning: 'industry',
};

// ─── Agent Skills ─────────────────────────────────────────────
const AGENT_SKILLS: Record<ExtendedAgentType, string[]> = {
  // Core
  planner: ['task_decomposition', 'prioritization', 'scheduling', 'resource_allocation'],
  architect: ['system_design', 'pattern_selection', 'component_modeling', 'api_design'],
  researcher: ['web_search', 'document_analysis', 'data_extraction', 'synthesis'],
  coder: ['code_generation', 'debugging', 'refactoring', 'testing'],
  reviewer: ['code_review', 'quality_assessment', 'best_practices', 'feedback'],
  verifier: ['validation', 'compliance_check', 'assertion_testing', 'certification'],
  memory: ['context_retrieval', 'knowledge_indexing', 'summarization', 'association'],
  // Engineering
  devops: ['ci_cd_pipeline', 'infrastructure_as_code', 'monitoring', 'containerization'],
  security: ['vulnerability_scanning', 'penetration_testing', 'threat_modeling', 'compliance_audit'],
  testing: ['unit_testing', 'integration_testing', 'e2e_testing', 'performance_testing'],
  uiux: ['user_research', 'wireframing', 'prototyping', 'accessibility_audit'],
  database: ['schema_design', 'query_optimization', 'migration_planning', 'data_modeling'],
  documentation: ['api_documentation', 'technical_writing', 'diagram_generation', 'onboarding_guides'],
  deployment: ['release_management', 'rollback_planning', 'environment_config', 'feature_flags'],
  // Executive
  ceo: ['strategic_vision', 'organizational_leadership', 'decision_making', 'stakeholder_management'],
  cto: ['technology_strategy', 'architecture_oversight', 'innovation_management', 'team_leadership'],
  product_manager: ['product_strategy', 'roadmap_planning', 'user_story_creation', 'market_validation'],
  // Engineering (additional)
  backend: ['api_development', 'database_design', 'server_architecture', 'microservices'],
  frontend: ['ui_development', 'responsive_design', 'state_management', 'component_architecture'],
  fullstack: ['end_to_end_development', 'api_integration', 'database_design', 'deployment'],
  cloud: ['cloud_architecture', 'cost_optimization', 'scalability_planning', 'multi_cloud_strategy'],
  code_review: ['code_quality_assessment', 'pattern_analysis', 'security_review', 'performance_review'],
  // Research
  fact_verification: ['source_validation', 'claim_verification', 'evidence_assessment', 'credibility_scoring'],
  market_intelligence: ['market_sizing', 'trend_analysis', 'opportunity_identification', 'competitive_mapping'],
  competitor_analysis: ['competitor_profiling', 'benchmarking', 'gap_analysis', 'market_positioning'],
  // Business
  automation: ['workflow_design', 'script_generation', 'task_automation', 'orchestration'],
  business: ['market_analysis', 'strategy_planning', 'roi_calculation', 'stakeholder_communication'],
  recruitment: ['candidate_screening', 'interview_design', 'skill_assessment', 'onboarding'],
  hr: ['employee_relations', 'policy_development', 'performance_management', 'talent_development'],
  crm: ['customer_relationship', 'pipeline_management', 'customer_retention', 'engagement_tracking'],
  sales: ['lead_generation', 'pipeline_management', 'negotiation', 'closing_techniques'],
  marketing: ['campaign_strategy', 'brand_management', 'audience_targeting', 'channel_optimization'],
  content: ['content_strategy', 'copywriting', 'content_calendar', 'editorial_planning'],
  seo: ['keyword_analysis', 'content_optimization', 'technical_seo', 'analytics'],
  // Data
  data_analyst: ['statistical_analysis', 'data_visualization', 'hypothesis_testing', 'insight_generation'],
  etl: ['data_extraction', 'data_transformation', 'data_loading', 'pipeline_orchestration'],
  bi: ['dashboard_creation', 'kpi_tracking', 'trend_analysis', 'executive_reporting'],
  reporting: ['report_generation', 'data_aggregation', 'automated_reporting', 'stakeholder_communication'],
  // Knowledge
  knowledge: ['knowledge_curation', 'ontology_management', 'information_retrieval', 'knowledge_graph_maintenance'],
  rag: ['retrieval_augmentation', 'chunk_optimization', 'context_assembly', 'source_ranking'],
  graph: ['graph_modeling', 'relationship_mapping', 'traversal_optimization', 'pattern_discovery'],
  // Security (additional)
  audit: ['security_audit', 'compliance_verification', 'risk_assessment', 'control_evaluation'],
  compliance: ['regulatory_compliance', 'policy_enforcement', 'governance_framework', 'audit_preparation'],
  threat_detection: ['threat_hunting', 'anomaly_detection', 'incident_response', 'indicator_analysis'],
  // Automation (additional)
  workflow: ['workflow_orchestration', 'process_automation', 'task_chaining', 'conditional_routing'],
  scheduler: ['job_scheduling', 'cron_management', 'task_prioritization', 'resource_allocation'],
  integration: ['api_integration', 'webhook_management', 'data_synchronization', 'connector_development'],
  // Platform
  github: ['repository_management', 'pull_request_workflow', 'ci_integration', 'code_review_automation'],
  docker: ['containerization', 'image_management', 'compose_orchestration', 'multi_stage_builds'],
  kubernetes: ['cluster_management', 'deployment_orchestration', 'service_mesh', 'autoscaling'],
  cloudflare: ['cdn_management', 'dns_configuration', 'security_rules', 'edge_computing'],
  wordpress: ['theme_development', 'plugin_management', 'content_management', 'seo_optimization'],
  moodle: ['course_creation', 'quiz_development', 'grade_management', 'plugin_configuration'],
  // AI
  prompt_engineering: ['prompt_design', 'few_shot_learning', 'chain_of_thought', 'prompt_optimization'],
  model_optimization: ['model_fine_tuning', 'hyperparameter_search', 'quantization', 'distillation'],
  swarm_optimization: ['swarm_coordination', 'agent_selection', 'task_decomposition', 'collective_intelligence'],
  brain_optimization: ['brain_routing', 'cognitive_load_balancing', 'model_selection', 'context_optimization'],
  // Multimodal
  voice: ['speech_recognition', 'voice_synthesis', 'audio_processing', 'conversation_management'],
  vision: ['image_analysis', 'object_detection', 'visual_qa', 'document_ocr'],
  meeting: ['meeting_summarization', 'action_item_extraction', 'transcription', 'participant_tracking'],
  browser: ['web_navigation', 'content_extraction', 'form_interaction', 'screenshot_analysis'],
  computer_use: ['desktop_automation', 'application_control', 'file_management', 'system_interaction'],
  // Industry
  aviation: ['flight_planning', 'weather_analysis', 'route_optimization', 'safety_compliance'],
  airline_recruitment: ['pilot_assessment', 'crew_resource_management', 'regulatory_compliance', 'candidate_matching'],
  aviation_training: ['curriculum_design', 'simulation_planning', 'competency_assessment', 'regulatory_training'],
  financial_analysis: ['financial_modeling', 'risk_assessment', 'valuation_analysis', 'regulatory_compliance'],
  legal_research: ['case_law_research', 'statutory_analysis', 'contract_review', 'regulatory_interpretation'],
  procurement: ['vendor_evaluation', 'contract_negotiation', 'supply_chain_optimization', 'cost_analysis'],
  customer_success: ['customer_onboarding', 'health_scoring', 'retention_strategy', 'escalation_management'],
  strategic_planning: ['scenario_planning', 'resource_allocation', 'goal_setting', 'performance_tracking'],
};

// ─── Agent Tools ──────────────────────────────────────────────
const AGENT_TOOLS: Record<ExtendedAgentType, string[]> = {
  // Core
  planner: ['llm', 'scheduler', 'calendar'],
  architect: ['llm', 'diagram_generator', 'schema_validator'],
  researcher: ['llm', 'web_search', 'document_parser'],
  coder: ['llm', 'code_runner', 'file_system', 'version_control'],
  reviewer: ['llm', 'linter', 'diff_viewer'],
  verifier: ['llm', 'test_runner', 'assertion_engine'],
  memory: ['llm', 'vector_store', 'graph_database'],
  // Engineering
  devops: ['llm', 'docker', 'kubernetes', 'terraform'],
  security: ['llm', 'scanner', 'dependency_auditor'],
  testing: ['llm', 'test_runner', 'coverage_analyzer', 'mock_generator'],
  uiux: ['llm', 'design_tool', 'color_palette', 'typography_engine'],
  database: ['llm', 'query_runner', 'migration_tool', 'schema_analyzer'],
  documentation: ['llm', 'markdown_renderer', 'diagram_generator', 'api_inspector'],
  deployment: ['llm', 'release_manager', 'env_manager', 'health_checker'],
  // Executive
  ceo: ['llm', 'dashboard', 'decision_framework', 'communication_hub'],
  cto: ['llm', 'architecture_tool', 'tech_radar', 'team_analytics'],
  product_manager: ['llm', 'roadmap_tool', 'user_feedback', 'analytics_dashboard'],
  // Engineering (additional)
  backend: ['llm', 'api_tester', 'database_tool', 'server_monitor'],
  frontend: ['llm', 'component_builder', 'style_tool', 'browser_devtools'],
  fullstack: ['llm', 'code_runner', 'database_tool', 'deployment_tool'],
  cloud: ['llm', 'cloud_console', 'cost_calculator', 'infrastructure_designer'],
  code_review: ['llm', 'linter', 'diff_viewer', 'complexity_analyzer'],
  // Research
  fact_verification: ['llm', 'source_search', 'claim_checker', 'evidence_database'],
  market_intelligence: ['llm', 'market_database', 'trend_analyzer', 'report_generator'],
  competitor_analysis: ['llm', 'web_scraper', 'benchmark_tool', 'positioning_matrix'],
  // Business
  automation: ['llm', 'script_engine', 'scheduler', 'webhook_manager'],
  business: ['llm', 'spreadsheet', 'chart_generator', 'report_builder'],
  recruitment: ['llm', 'resume_parser', 'skill_matcher', 'scheduler'],
  hr: ['llm', 'hr_system', 'policy_engine', 'performance_tracker'],
  crm: ['llm', 'crm_platform', 'email_integration', 'analytics'],
  sales: ['llm', 'crm_platform', 'pipeline_tool', 'outreach_automation'],
  marketing: ['llm', 'campaign_manager', 'analytics_dashboard', 'content_scheduler'],
  content: ['llm', 'editor', 'seo_analyzer', 'content_calendar'],
  seo: ['llm', 'keyword_tool', 'page_analyzer', 'rank_tracker'],
  // Data
  data_analyst: ['llm', 'statistical_engine', 'visualization_tool', 'data_pipeline'],
  etl: ['llm', 'data_connector', 'transformation_engine', 'pipeline_orchestrator'],
  bi: ['llm', 'dashboard_builder', 'query_engine', 'data_warehouse'],
  reporting: ['llm', 'report_builder', 'data_aggregator', 'template_engine'],
  // Knowledge
  knowledge: ['llm', 'knowledge_base', 'ontology_editor', 'search_engine'],
  rag: ['llm', 'vector_store', 'chunk_manager', 'context_assembler'],
  graph: ['llm', 'graph_database', 'visualization_tool', 'query_engine'],
  // Security (additional)
  audit: ['llm', 'audit_framework', 'compliance_checker', 'report_generator'],
  compliance: ['llm', 'regulation_database', 'policy_checker', 'audit_trail'],
  threat_detection: ['llm', 'siem_integration', 'threat_intelligence', 'anomaly_detector'],
  // Automation (additional)
  workflow: ['llm', 'workflow_engine', 'task_queue', 'state_manager'],
  scheduler: ['llm', 'cron_engine', 'job_manager', 'priority_queue'],
  integration: ['llm', 'api_gateway', 'webhook_manager', 'data_mapper'],
  // Platform
  github: ['llm', 'github_api', 'git_operations', 'ci_monitor'],
  docker: ['llm', 'docker_cli', 'compose_tool', 'registry_manager'],
  kubernetes: ['llm', 'kubectl', 'helm_tool', 'cluster_monitor'],
  cloudflare: ['llm', 'cloudflare_api', 'dns_manager', 'analytics_tool'],
  wordpress: ['llm', 'wp_api', 'theme_builder', 'plugin_manager'],
  moodle: ['llm', 'moodle_api', 'course_builder', 'quiz_engine'],
  // AI
  prompt_engineering: ['llm', 'prompt_tester', 'template_engine', 'evaluation_framework'],
  model_optimization: ['llm', 'training_pipeline', 'evaluation_tool', 'benchmark_suite'],
  swarm_optimization: ['llm', 'swarm_coordinator', 'task_planner', 'performance_monitor'],
  brain_optimization: ['llm', 'brain_router', 'model_selector', 'context_optimizer'],
  // Multimodal
  voice: ['llm', 'speech_to_text', 'text_to_speech', 'audio_processor'],
  vision: ['llm', 'image_analyzer', 'ocr_engine', 'object_detector'],
  meeting: ['llm', 'transcription_service', 'calendar_api', 'note_taker'],
  browser: ['llm', 'browser_automation', 'content_extractor', 'screenshot_tool'],
  computer_use: ['llm', 'desktop_automation', 'screen_reader', 'input_controller'],
  // Industry
  aviation: ['llm', 'weather_api', 'chart_plotter', 'notam_reader'],
  airline_recruitment: ['llm', 'assessment_platform', 'compliance_checker', 'candidate_database'],
  aviation_training: ['llm', 'lms_platform', 'simulator_interface', 'competency_tracker'],
  financial_analysis: ['llm', 'financial_modeler', 'risk_engine', 'regulatory_database'],
  legal_research: ['llm', 'case_database', 'statute_search', 'contract_analyzer'],
  procurement: ['llm', 'vendor_database', 'rfq_generator', 'contract_manager'],
  customer_success: ['llm', 'crm_integration', 'health_dashboard', 'escalation_engine'],
  strategic_planning: ['llm', 'scenario_modeler', 'resource_planner', 'goal_tracker'],
};

// ─── Agent System Prompts ─────────────────────────────────────
const AGENT_SYSTEM_PROMPTS: Record<ExtendedAgentType, string> = {
  // Core
  planner:
    'You are a Planning Agent. Decompose tasks into actionable steps, set priorities, allocate resources, and create schedules. Think systematically and produce clear, ordered plans.',
  architect:
    'You are an Architecture Agent. Design system architectures, select patterns, model components, and design APIs. Focus on scalability, maintainability, and clean separation of concerns.',
  researcher:
    'You are a Research Agent. Search the web, analyze documents, extract data, and synthesize findings. Provide well-sourced, accurate, and comprehensive research results.',
  coder:
    'You are a Coding Agent. Generate code, debug issues, refactor for quality, and write tests. Produce clean, type-safe, well-documented code following best practices.',
  reviewer:
    'You are a Review Agent. Review code for quality, assess adherence to best practices, and provide constructive feedback. Be thorough but actionable.',
  verifier:
    'You are a Verification Agent. Validate outputs against requirements, check compliance, run assertions, and certify results. Ensure correctness and completeness.',
  memory:
    'You are a Memory Agent. Retrieve relevant context, index knowledge, summarize information, and form associations. Help other agents access the right information at the right time.',
  // Engineering
  devops:
    'You are a DevOps Agent. Design CI/CD pipelines, manage infrastructure as code, set up monitoring, and handle containerization. Ensure reliable, automated deployment workflows.',
  security:
    'You are a Security Agent. Scan for vulnerabilities, perform penetration testing, model threats, and audit compliance. Prioritize risk mitigation and secure-by-default practices.',
  testing:
    'You are a Testing Agent. Write and execute unit tests, integration tests, E2E tests, and performance tests. Ensure comprehensive coverage and reliable test suites.',
  uiux:
    'You are a UI/UX Agent. Conduct user research, create wireframes, build prototypes, and audit accessibility. Design intuitive, inclusive, and delightful user experiences.',
  database:
    'You are a Database Agent. Design schemas, optimize queries, plan migrations, and model data. Ensure data integrity, performance, and scalability.',
  documentation:
    'You are a Documentation Agent. Write API docs, technical guides, generate diagrams, and create onboarding materials. Produce clear, accurate, and well-structured documentation.',
  deployment:
    'You are a Deployment Agent. Manage releases, plan rollbacks, configure environments, and handle feature flags. Ensure smooth, safe, and repeatable deployments.',
  // Executive
  ceo:
    'You are a CEO Agent. Provide strategic vision, organizational leadership, executive decision-making, and stakeholder management. Think big-picture while ensuring operational alignment.',
  cto:
    'You are a CTO Agent. Define technology strategy, oversee architecture decisions, drive innovation, and lead engineering teams. Balance technical excellence with business value.',
  product_manager:
    'You are a Product Manager Agent. Define product strategy, create roadmaps, write user stories, and validate market fit. Bridge the gap between user needs and technical execution.',
  // Engineering (additional)
  backend:
    'You are a Backend Agent. Develop APIs, design databases, architect server systems, and build microservices. Focus on reliability, performance, and clean API design.',
  frontend:
    'You are a Frontend Agent. Build user interfaces, implement responsive designs, manage state, and architect component systems. Create performant, accessible, and beautiful web experiences.',
  fullstack:
    'You are a Full Stack Agent. Build end-to-end features spanning frontend, backend, and database. Integrate APIs, design schemas, and deploy applications. Own the entire stack.',
  cloud:
    'You are a Cloud Agent. Architect cloud infrastructure, optimize costs, plan for scalability, and design multi-cloud strategies. Make cloud-native architectural decisions.',
  code_review:
    'You are a Code Review Agent. Assess code quality, analyze patterns, review for security issues, and evaluate performance. Provide constructive, specific, and actionable feedback.',
  // Research
  fact_verification:
    'You are a Fact Verification Agent. Validate sources, verify claims, assess evidence quality, and score credibility. Ensure information accuracy and flag misinformation.',
  market_intelligence:
    'You are a Market Intelligence Agent. Size markets, analyze trends, identify opportunities, and map competitive landscapes. Provide data-driven market insights.',
  competitor_analysis:
    'You are a Competitor Analysis Agent. Profile competitors, benchmark performance, identify gaps, and assess market positioning. Deliver actionable competitive intelligence.',
  // Business
  automation:
    'You are an Automation Agent. Design workflows, generate scripts, automate repetitive tasks, and orchestrate multi-step processes. Maximize efficiency and minimize manual effort.',
  business:
    'You are a Business Agent. Analyze markets, plan strategies, calculate ROI, and communicate with stakeholders. Provide data-driven business insights and recommendations.',
  recruitment:
    'You are a Recruitment Agent. Screen candidates, design interviews, assess skills, and plan onboarding. Match talent to roles efficiently and fairly.',
  hr:
    'You are an HR Agent. Manage employee relations, develop policies, track performance, and nurture talent. Create a fair, productive, and compliant workplace.',
  crm:
    'You are a CRM Agent. Manage customer relationships, track pipelines, improve retention, and monitor engagement. Maximize customer lifetime value.',
  sales:
    'You are a Sales Agent. Generate leads, manage pipelines, negotiate deals, and close opportunities. Drive revenue growth through strategic selling.',
  marketing:
    'You are a Marketing Agent. Develop campaign strategies, manage brands, target audiences, and optimize channels. Maximize reach and engagement.',
  content:
    'You are a Content Agent. Create content strategies, write compelling copy, plan editorial calendars, and optimize content. Produce engaging, high-quality content at scale.',
  seo:
    'You are an SEO Agent. Analyze keywords, optimize content, handle technical SEO, and track analytics. Improve search visibility and organic traffic.',
  // Data
  data_analyst:
    'You are a Data Analyst Agent. Perform statistical analysis, create visualizations, test hypotheses, and generate insights. Transform raw data into actionable intelligence.',
  etl:
    'You are an ETL Agent. Extract data from diverse sources, transform it into target schemas, load into data stores, and orchestrate pipelines. Ensure data quality and reliability.',
  bi:
    'You are a BI Agent. Create dashboards, track KPIs, analyze trends, and produce executive reports. Make business metrics accessible and actionable.',
  reporting:
    'You are a Reporting Agent. Generate reports, aggregate data, automate reporting workflows, and communicate to stakeholders. Deliver timely, accurate, and well-formatted reports.',
  // Knowledge
  knowledge:
    'You are a Knowledge Agent. Curate knowledge, manage ontologies, retrieve information, and maintain knowledge graphs. Organize and surface organizational knowledge effectively.',
  rag:
    'You are a RAG Agent. Augment retrieval with generation, optimize chunking strategies, assemble relevant context, and rank sources. Maximize the quality of retrieval-augmented generation.',
  graph:
    'You are a Graph Agent. Model graph structures, map relationships, optimize traversals, and discover patterns. Leverage connected data for deep insights.',
  // Security (additional)
  audit:
    'You are an Audit Agent. Conduct security audits, verify compliance, assess risks, and evaluate controls. Ensure thorough, evidence-based audit outcomes.',
  compliance:
    'You are a Compliance Agent. Enforce regulatory compliance, develop governance frameworks, prepare for audits, and maintain policy adherence. Keep the organization compliant and governed.',
  threat_detection:
    'You are a Threat Detection Agent. Hunt threats, detect anomalies, respond to incidents, and analyze indicators. Identify and mitigate security threats proactively.',
  // Automation (additional)
  workflow:
    'You are a Workflow Agent. Orchestrate workflows, automate processes, chain tasks, and route conditionally. Build reliable, efficient, and scalable workflow automation.',
  scheduler:
    'You are a Scheduler Agent. Schedule jobs, manage cron tasks, prioritize work, and allocate resources. Ensure timely and efficient task execution.',
  integration:
    'You are an Integration Agent. Connect APIs, manage webhooks, synchronize data, and develop connectors. Bridge systems seamlessly and reliably.',
  // Platform
  github:
    'You are a GitHub Agent. Manage repositories, orchestrate pull request workflows, integrate CI, and automate code reviews. Leverage GitHub for collaborative development.',
  docker:
    'You are a Docker Agent. Containerize applications, manage images, orchestrate with Compose, and build multi-stage builds. Ensure portable, reproducible environments.',
  kubernetes:
    'You are a Kubernetes Agent. Manage clusters, orchestrate deployments, configure service meshes, and implement autoscaling. Run containerized workloads at scale.',
  cloudflare:
    'You are a Cloudflare Agent. Manage CDN, configure DNS, set security rules, and deploy edge computing. Optimize performance and security at the edge.',
  wordpress:
    'You are a WordPress Agent. Develop themes, manage plugins, curate content, and optimize SEO. Build and maintain WordPress sites effectively.',
  moodle:
    'You are a Moodle Agent. Create courses, develop quizzes, manage grades, and configure plugins. Build effective learning experiences on Moodle.',
  // AI
  prompt_engineering:
    'You are a Prompt Engineering Agent. Design prompts, apply few-shot learning, implement chain-of-thought, and optimize prompt performance. Craft prompts that consistently produce high-quality outputs.',
  model_optimization:
    'You are a Model Optimization Agent. Fine-tune models, search hyperparameters, apply quantization, and distill models. Maximize model performance and efficiency.',
  swarm_optimization:
    'You are a Swarm Optimization Agent. Coordinate swarms, select agents, decompose tasks, and harness collective intelligence. Optimize multi-agent collaboration.',
  brain_optimization:
    'You are a Brain Optimization Agent. Route to optimal brains, balance cognitive load, select models, and optimize context. Maximize the effectiveness of the brain system.',
  // Multimodal
  voice:
    'You are a Voice Agent. Recognize speech, synthesize voice, process audio, and manage conversations. Enable natural voice interactions.',
  vision:
    'You are a Vision Agent. Analyze images, detect objects, answer visual questions, and perform OCR. Extract meaning from visual content.',
  meeting:
    'You are a Meeting Agent. Summarize meetings, extract action items, transcribe conversations, and track participants. Make meetings productive and actionable.',
  browser:
    'You are a Browser Agent. Navigate the web, extract content, interact with forms, and analyze screenshots. Automate web-based tasks effectively.',
  computer_use:
    'You are a Computer Use Agent. Automate desktop tasks, control applications, manage files, and interact with systems. Bridge the gap between AI and desktop computing.',
  // Industry
  aviation:
    'You are an Aviation Agent. Plan flights, analyze weather, optimize routes, and ensure safety compliance. Follow aviation regulations and best practices.',
  airline_recruitment:
    'You are an Airline Recruitment Agent. Assess pilots, evaluate crew resource management, ensure regulatory compliance, and match candidates to aviation roles.',
  aviation_training:
    'You are an Aviation Training Agent. Design curricula, plan simulations, assess competencies, and deliver regulatory training. Build effective aviation training programs.',
  financial_analysis:
    'You are a Financial Analysis Agent. Build financial models, assess risks, perform valuations, and ensure regulatory compliance. Deliver rigorous financial insights.',
  legal_research:
    'You are a Legal Research Agent. Research case law, analyze statutes, review contracts, and interpret regulations. Provide thorough, accurate legal analysis.',
  procurement:
    'You are a Procurement Agent. Evaluate vendors, negotiate contracts, optimize supply chains, and analyze costs. Drive cost-effective and reliable procurement.',
  customer_success:
    'You are a Customer Success Agent. Onboard customers, score health, develop retention strategies, and manage escalations. Ensure customers achieve their goals.',
  strategic_planning:
    'You are a Strategic Planning Agent. Plan scenarios, allocate resources, set goals, and track performance. Drive organizational strategy with data and foresight.',
};

// ─── Agent Display Names ──────────────────────────────────────
const AGENT_NAMES: Record<ExtendedAgentType, string> = {
  // Core
  planner: 'Planner',
  architect: 'Architect',
  researcher: 'Researcher',
  coder: 'Coder',
  reviewer: 'Reviewer',
  verifier: 'Verifier',
  memory: 'Memory',
  // Engineering
  devops: 'DevOps',
  security: 'Security',
  testing: 'Testing',
  uiux: 'UI/UX',
  database: 'Database',
  documentation: 'Documentation',
  deployment: 'Deployment',
  // Executive
  ceo: 'CEO',
  cto: 'CTO',
  product_manager: 'Product Manager',
  // Engineering (additional)
  backend: 'Backend',
  frontend: 'Frontend',
  fullstack: 'Full Stack',
  cloud: 'Cloud',
  code_review: 'Code Review',
  // Research
  fact_verification: 'Fact Verification',
  market_intelligence: 'Market Intelligence',
  competitor_analysis: 'Competitor Analysis',
  // Business
  automation: 'Automation',
  business: 'Business',
  recruitment: 'Recruitment',
  hr: 'HR',
  crm: 'CRM',
  sales: 'Sales',
  marketing: 'Marketing',
  content: 'Content',
  seo: 'SEO',
  // Data
  data_analyst: 'Data Analyst',
  etl: 'ETL',
  bi: 'BI',
  reporting: 'Reporting',
  // Knowledge
  knowledge: 'Knowledge',
  rag: 'RAG',
  graph: 'Graph',
  // Security (additional)
  audit: 'Audit',
  compliance: 'Compliance',
  threat_detection: 'Threat Detection',
  // Automation (additional)
  workflow: 'Workflow',
  scheduler: 'Scheduler',
  integration: 'Integration',
  // Platform
  github: 'GitHub',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  cloudflare: 'Cloudflare',
  wordpress: 'WordPress',
  moodle: 'Moodle',
  // AI
  prompt_engineering: 'Prompt Engineering',
  model_optimization: 'Model Optimization',
  swarm_optimization: 'Swarm Optimization',
  brain_optimization: 'Brain Optimization',
  // Multimodal
  voice: 'Voice',
  vision: 'Vision',
  meeting: 'Meeting',
  browser: 'Browser',
  computer_use: 'Computer Use',
  // Industry
  aviation: 'Aviation',
  airline_recruitment: 'Airline Recruitment',
  aviation_training: 'Aviation Training',
  financial_analysis: 'Financial Analysis',
  legal_research: 'Legal Research',
  procurement: 'Procurement',
  customer_success: 'Customer Success',
  strategic_planning: 'Strategic Planning',
};

// ─── Agent Descriptors (Lazy Loading Registry) ────────────────
// Lightweight metadata — NO instances are created until spawn() is called.
const AGENT_DESCRIPTORS: Map<ExtendedAgentType, AgentDescriptor> = new Map(
  (Object.keys(AGENT_NAMES) as ExtendedAgentType[]).map((type) => [
    type,
    {
      type,
      name: AGENT_NAMES[type],
      category: AGENT_CATEGORIES[type],
      skills: [...AGENT_SKILLS[type]],
      tools: [...AGENT_TOOLS[type]],
      systemPrompt: AGENT_SYSTEM_PROMPTS[type],
    },
  ])
);

// ─── DNA Defaults ─────────────────────────────────────────────
function createDefaultDNA(agentId: string, type: ExtendedAgentType): AgentDNA {
  return {
    agentId,
    knowledge: [`${type}_fundamentals`, `domain_${type}`],
    skills: [...AGENT_SKILLS[type]],
    tools: [...AGENT_TOOLS[type]],
    successRate: 0,
    failureRate: 0,
    experience: 0,
    learningHistory: [],
    preferredModels: ['openai', 'claude'],
    performanceHistory: [],
  };
}

// ─── Agent Memory Defaults ────────────────────────────────────
function createDefaultMemory(): AgentMemory {
  return {
    shortTerm: [],
    longTerm: [],
  };
}

// ─── Base Agent ───────────────────────────────────────────────
abstract class BaseAgent {
  id: string;
  name: string;
  type: ExtendedAgentType;
  category: AgentCategory;
  status: AgentStatus;
  currentTask: string | null;
  createdAt: number;
  lastActiveAt: number;
  dna: AgentDNA;
  memory: AgentMemory;

  constructor(name: string, type: ExtendedAgentType) {
    this.id = uuidv4();
    this.name = name;
    this.type = type;
    this.category = AGENT_CATEGORIES[type];
    this.status = 'idle';
    this.currentTask = null;
    this.createdAt = Date.now();
    this.lastActiveAt = Date.now();
    this.dna = createDefaultDNA(this.id, type);
    this.memory = createDefaultMemory();
  }

  /** Get the system prompt for this agent type */
  getSystemPrompt(): string {
    return AGENT_SYSTEM_PROMPTS[this.type];
  }

  /** Get the skills for this agent type */
  getSkills(): string[] {
    return this.dna.skills;
  }

  /** Get the tools for this agent type */
  getTools(): string[] {
    return this.dna.tools;
  }

  /** Execute a task — subclasses may override for custom behavior */
  abstract execute(task: string): Promise<AgentMessage>;

  /** Execute a task using the model router for AI-powered execution */
  protected async executeWithAI(task: string): Promise<string> {
    try {
      const response = await modelRouter.executeWithFailover({
        prompt: `You are a ${this.type} agent. Execute this task: ${task}`,
        systemPrompt: this.getSystemPrompt(),
        temperature: 0.3,
      });
      return response.content;
    } catch {
      return this.fallbackExecute(task);
    }
  }

  /** Fallback when AI execution is unavailable */
  protected fallbackExecute(task: string): string {
    return `[${this.name}] Processed task: ${task}`;
  }

  /** Update DNA after a task execution */
  protected updateDNA(task: string, outcome: 'success' | 'failure', durationMs: number): void {
    const totalTasks = this.dna.experience;
    const currentSuccesses = this.dna.successRate * totalTasks;
    const currentFailures = this.dna.failureRate * totalTasks;

    this.dna.experience += 1;

    if (outcome === 'success') {
      this.dna.successRate = (currentSuccesses + 1) / this.dna.experience;
      this.dna.failureRate = currentFailures / this.dna.experience;
    } else {
      this.dna.failureRate = (currentFailures + 1) / this.dna.experience;
      this.dna.successRate = currentSuccesses / this.dna.experience;
    }

    this.dna.learningHistory.push({
      task,
      outcome,
      timestamp: Date.now(),
    });

    // Keep learning history bounded
    if (this.dna.learningHistory.length > 500) {
      this.dna.learningHistory = this.dna.learningHistory.slice(-250);
    }

    this.dna.performanceHistory.push({
      metric: 'execution_duration_ms',
      value: durationMs,
      timestamp: Date.now(),
    });

    // Keep performance history bounded
    if (this.dna.performanceHistory.length > 1000) {
      this.dna.performanceHistory = this.dna.performanceHistory.slice(-500);
    }

    this.lastActiveAt = Date.now();
  }

  /** Store a short-term memory entry */
  protected storeShortTermMemory(key: string, value: string): void {
    this.memory.shortTerm.push({ key, value, timestamp: Date.now() });
    // Keep short-term memory bounded
    if (this.memory.shortTerm.length > 50) {
      this.memory.shortTerm = this.memory.shortTerm.slice(-25);
    }
  }

  /** Store a long-term memory entry */
  protected storeLongTermMemory(key: string, value: string, importance: number = 0.5): void {
    this.memory.longTerm.push({ key, value, timestamp: Date.now(), importance });
    // Keep long-term memory bounded, evict lowest importance first
    if (this.memory.longTerm.length > 200) {
      this.memory.longTerm.sort((a, b) => b.importance - a.importance);
      this.memory.longTerm = this.memory.longTerm.slice(0, 150);
    }
  }

  /** Retrieve short-term memory */
  getShortTermMemory(key?: string): Array<{ key: string; value: string; timestamp: number }> {
    if (key) return this.memory.shortTerm.filter((m) => m.key === key);
    return [...this.memory.shortTerm];
  }

  /** Retrieve long-term memory */
  getLongTermMemory(key?: string): Array<{ key: string; value: string; timestamp: number; importance: number }> {
    if (key) return this.memory.longTerm.filter((m) => m.key === key);
    return [...this.memory.longTerm];
  }

  /** Get agent status and config */
  getStatus(): AgentConfig {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      config: {},
      currentTask: this.currentTask ?? undefined,
      dna: this.dna,
      memory: this.memory,
      category: this.category,
    };
  }

  /** Create a message */
  protected createMessage(type: AgentMessage['type'], content: string): AgentMessage {
    return { id: uuidv4(), agentId: this.id, type, content, timestamp: Date.now() };
  }

  /** Get the experience score for swarm priority */
  getExperienceScore(): number {
    return this.dna.experience * this.dna.successRate;
  }

  /** Clean up resources before unloading */
  cleanup(): void {
    this.status = 'idle';
    this.currentTask = null;
    // Trim memory to reduce footprint
    if (this.memory.shortTerm.length > 10) {
      this.memory.shortTerm = this.memory.shortTerm.slice(-10);
    }
    if (this.memory.longTerm.length > 50) {
      this.memory.longTerm.sort((a, b) => b.importance - a.importance);
      this.memory.longTerm = this.memory.longTerm.slice(0, 50);
    }
  }
}

// ─── Generic Agent (replaces per-type concrete classes) ───────
// A single generic agent class handles all types. The DNA and
// descriptor system provide type-specific behavior, making
// per-type subclasses unnecessary and keeping spawn time < 500ms.
class GenericAgent extends BaseAgent {
  private memoryPrefix: string;

  constructor(type: ExtendedAgentType) {
    super(AGENT_NAMES[type], type);
    this.memoryPrefix = `${type}:`;
  }

  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`${this.memoryPrefix}${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

// ─── Concrete Agent Classes (backward-compatible aliases) ─────
// These thin subclasses exist only for backward compatibility
// with code that imports named agent classes.

class PlannerAgent extends GenericAgent { constructor() { super('planner'); } }
class ArchitectAgent extends GenericAgent { constructor() { super('architect'); } }
class ResearcherAgent extends GenericAgent { constructor() { super('researcher'); } }
class CoderAgent extends GenericAgent { constructor() { super('coder'); } }
class ReviewerAgent extends GenericAgent { constructor() { super('reviewer'); } }
class VerifierAgent extends GenericAgent { constructor() { super('verifier'); } }
class MemoryAgent extends GenericAgent { constructor() { super('memory'); } }
class DevOpsAgent extends GenericAgent { constructor() { super('devops'); } }
class SecurityAgent extends GenericAgent { constructor() { super('security'); } }
class TestingAgent extends GenericAgent { constructor() { super('testing'); } }
class UIUXAgent extends GenericAgent { constructor() { super('uiux'); } }
class SEOAgent extends GenericAgent { constructor() { super('seo'); } }
class AutomationAgent extends GenericAgent { constructor() { super('automation'); } }
class BusinessAgent extends GenericAgent { constructor() { super('business'); } }
class RecruitmentAgent extends GenericAgent { constructor() { super('recruitment'); } }
class AviationAgent extends GenericAgent { constructor() { super('aviation'); } }
class DatabaseAgent extends GenericAgent { constructor() { super('database'); } }
class DocumentationAgent extends GenericAgent { constructor() { super('documentation'); } }
class DeploymentAgent extends GenericAgent { constructor() { super('deployment'); } }

// New agent type classes
class CEOAgent extends GenericAgent { constructor() { super('ceo'); } }
class CTOAgent extends GenericAgent { constructor() { super('cto'); } }
class ProductManagerAgent extends GenericAgent { constructor() { super('product_manager'); } }
class BackendAgent extends GenericAgent { constructor() { super('backend'); } }
class FrontendAgent extends GenericAgent { constructor() { super('frontend'); } }
class FullStackAgent extends GenericAgent { constructor() { super('fullstack'); } }
class CloudAgent extends GenericAgent { constructor() { super('cloud'); } }
class CodeReviewAgent extends GenericAgent { constructor() { super('code_review'); } }
class FactVerificationAgent extends GenericAgent { constructor() { super('fact_verification'); } }
class MarketIntelligenceAgent extends GenericAgent { constructor() { super('market_intelligence'); } }
class CompetitorAnalysisAgent extends GenericAgent { constructor() { super('competitor_analysis'); } }
class HRAgent extends GenericAgent { constructor() { super('hr'); } }
class CRMAgent extends GenericAgent { constructor() { super('crm'); } }
class SalesAgent extends GenericAgent { constructor() { super('sales'); } }
class MarketingAgent extends GenericAgent { constructor() { super('marketing'); } }
class ContentAgent extends GenericAgent { constructor() { super('content'); } }
class DataAnalystAgent extends GenericAgent { constructor() { super('data_analyst'); } }
class ETLAgent extends GenericAgent { constructor() { super('etl'); } }
class BIAgent extends GenericAgent { constructor() { super('bi'); } }
class ReportingAgent extends GenericAgent { constructor() { super('reporting'); } }
class KnowledgeAgent extends GenericAgent { constructor() { super('knowledge'); } }
class RAGAgent extends GenericAgent { constructor() { super('rag'); } }
class GraphAgent extends GenericAgent { constructor() { super('graph'); } }
class AuditAgent extends GenericAgent { constructor() { super('audit'); } }
class ComplianceAgent extends GenericAgent { constructor() { super('compliance'); } }
class ThreatDetectionAgent extends GenericAgent { constructor() { super('threat_detection'); } }
class WorkflowAgent extends GenericAgent { constructor() { super('workflow'); } }
class SchedulerAgent extends GenericAgent { constructor() { super('scheduler'); } }
class IntegrationAgent extends GenericAgent { constructor() { super('integration'); } }
class GitHubAgent extends GenericAgent { constructor() { super('github'); } }
class DockerAgent extends GenericAgent { constructor() { super('docker'); } }
class KubernetesAgent extends GenericAgent { constructor() { super('kubernetes'); } }
class CloudflareAgent extends GenericAgent { constructor() { super('cloudflare'); } }
class WordPressAgent extends GenericAgent { constructor() { super('wordpress'); } }
class MoodleAgent extends GenericAgent { constructor() { super('moodle'); } }
class PromptEngineeringAgent extends GenericAgent { constructor() { super('prompt_engineering'); } }
class ModelOptimizationAgent extends GenericAgent { constructor() { super('model_optimization'); } }
class SwarmOptimizationAgent extends GenericAgent { constructor() { super('swarm_optimization'); } }
class BrainOptimizationAgent extends GenericAgent { constructor() { super('brain_optimization'); } }
class VoiceAgent extends GenericAgent { constructor() { super('voice'); } }
class VisionAgent extends GenericAgent { constructor() { super('vision'); } }
class MeetingAgent extends GenericAgent { constructor() { super('meeting'); } }
class BrowserAgent extends GenericAgent { constructor() { super('browser'); } }
class ComputerUseAgent extends GenericAgent { constructor() { super('computer_use'); } }
class AirlineRecruitmentAgent extends GenericAgent { constructor() { super('airline_recruitment'); } }
class AviationTrainingAgent extends GenericAgent { constructor() { super('aviation_training'); } }
class FinancialAnalysisAgent extends GenericAgent { constructor() { super('financial_analysis'); } }
class LegalResearchAgent extends GenericAgent { constructor() { super('legal_research'); } }
class ProcurementAgent extends GenericAgent { constructor() { super('procurement'); } }
class CustomerSuccessAgent extends GenericAgent { constructor() { super('customer_success'); } }
class StrategicPlanningAgent extends GenericAgent { constructor() { super('strategic_planning'); } }

// ─── Agent Factory Map ────────────────────────────────────────
const AGENT_FACTORIES: Record<ExtendedAgentType, () => BaseAgent> = {
  // Core
  planner: () => new PlannerAgent(),
  architect: () => new ArchitectAgent(),
  researcher: () => new ResearcherAgent(),
  coder: () => new CoderAgent(),
  reviewer: () => new ReviewerAgent(),
  verifier: () => new VerifierAgent(),
  memory: () => new MemoryAgent(),
  // Engineering
  devops: () => new DevOpsAgent(),
  security: () => new SecurityAgent(),
  testing: () => new TestingAgent(),
  uiux: () => new UIUXAgent(),
  database: () => new DatabaseAgent(),
  documentation: () => new DocumentationAgent(),
  deployment: () => new DeploymentAgent(),
  // Executive
  ceo: () => new CEOAgent(),
  cto: () => new CTOAgent(),
  product_manager: () => new ProductManagerAgent(),
  // Engineering (additional)
  backend: () => new BackendAgent(),
  frontend: () => new FrontendAgent(),
  fullstack: () => new FullStackAgent(),
  cloud: () => new CloudAgent(),
  code_review: () => new CodeReviewAgent(),
  // Research
  fact_verification: () => new FactVerificationAgent(),
  market_intelligence: () => new MarketIntelligenceAgent(),
  competitor_analysis: () => new CompetitorAnalysisAgent(),
  // Business
  automation: () => new AutomationAgent(),
  business: () => new BusinessAgent(),
  recruitment: () => new RecruitmentAgent(),
  hr: () => new HRAgent(),
  crm: () => new CRMAgent(),
  sales: () => new SalesAgent(),
  marketing: () => new MarketingAgent(),
  content: () => new ContentAgent(),
  seo: () => new SEOAgent(),
  // Data
  data_analyst: () => new DataAnalystAgent(),
  etl: () => new ETLAgent(),
  bi: () => new BIAgent(),
  reporting: () => new ReportingAgent(),
  // Knowledge
  knowledge: () => new KnowledgeAgent(),
  rag: () => new RAGAgent(),
  graph: () => new GraphAgent(),
  // Security (additional)
  audit: () => new AuditAgent(),
  compliance: () => new ComplianceAgent(),
  threat_detection: () => new ThreatDetectionAgent(),
  // Automation (additional)
  workflow: () => new WorkflowAgent(),
  scheduler: () => new SchedulerAgent(),
  integration: () => new IntegrationAgent(),
  // Platform
  github: () => new GitHubAgent(),
  docker: () => new DockerAgent(),
  kubernetes: () => new KubernetesAgent(),
  cloudflare: () => new CloudflareAgent(),
  wordpress: () => new WordPressAgent(),
  moodle: () => new MoodleAgent(),
  // AI
  prompt_engineering: () => new PromptEngineeringAgent(),
  model_optimization: () => new ModelOptimizationAgent(),
  swarm_optimization: () => new SwarmOptimizationAgent(),
  brain_optimization: () => new BrainOptimizationAgent(),
  // Multimodal
  voice: () => new VoiceAgent(),
  vision: () => new VisionAgent(),
  meeting: () => new MeetingAgent(),
  browser: () => new BrowserAgent(),
  computer_use: () => new ComputerUseAgent(),
  // Industry
  aviation: () => new AviationAgent(),
  airline_recruitment: () => new AirlineRecruitmentAgent(),
  aviation_training: () => new AviationTrainingAgent(),
  financial_analysis: () => new FinancialAnalysisAgent(),
  legal_research: () => new LegalResearchAgent(),
  procurement: () => new ProcurementAgent(),
  customer_success: () => new CustomerSuccessAgent(),
  strategic_planning: () => new StrategicPlanningAgent(),
};

// ─── Agent Registry (Lazy Loading) ───────────────────────────
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Check every minute

interface TrackedAgent {
  agent: BaseAgent;
  spawnedAt: number;
  lastAccessedAt: number;
}

class AgentRegistry {
  /** Live agent instances — only populated when spawn() is called */
  private agents: Map<string, TrackedAgent> = new Map();

  /** Factory functions for on-demand instantiation */
  private agentFactories: Map<ExtendedAgentType, () => BaseAgent> = new Map(
    Object.entries(AGENT_FACTORIES) as [ExtendedAgentType, () => BaseAgent][]
  );

  /** Configurable idle timeout in milliseconds */
  private idleTimeoutMs: number = DEFAULT_IDLE_TIMEOUT_MS;

  /** Cleanup interval handle */
  private cleanupHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /** Start the periodic cleanup timer */
  private startCleanupTimer(): void {
    if (this.cleanupHandle) return;
    this.cleanupHandle = setInterval(() => {
      this.removeIdleAgents(this.idleTimeoutMs);
    }, CLEANUP_INTERVAL_MS);

    // Allow the process to exit even if the timer is running
    if (this.cleanupHandle.unref) {
      this.cleanupHandle.unref();
    }
  }

  /** Stop the cleanup timer (for testing or shutdown) */
  stopCleanupTimer(): void {
    if (this.cleanupHandle) {
      clearInterval(this.cleanupHandle);
      this.cleanupHandle = null;
    }
  }

  /** Set the idle timeout for auto-unloading agents */
  setIdleTimeout(timeoutMs: number): void {
    this.idleTimeoutMs = timeoutMs;
  }

  /** Get the current idle timeout */
  getIdleTimeout(): number {
    return this.idleTimeoutMs;
  }

  /** Register an agent (adds to live instance map) */
  register(agent: BaseAgent): void {
    const now = Date.now();
    this.agents.set(agent.id, {
      agent,
      spawnedAt: now,
      lastAccessedAt: now,
    });
  }

  /** Get an agent by ID (touches last-accessed timestamp) */
  get(id: string): BaseAgent | undefined {
    const tracked = this.agents.get(id);
    if (tracked) {
      tracked.lastAccessedAt = Date.now();
      return tracked.agent;
    }
    return undefined;
  }

  /** List all live agent configs */
  list(): AgentConfig[] {
    return Array.from(this.agents.values()).map((t) => {
      t.lastAccessedAt = Date.now();
      return t.agent.getStatus();
    });
  }

  /** List agents by type */
  listByType(type: ExtendedAgentType): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((t) => t.agent.type === type)
      .map((t) => t.agent.getStatus());
  }

  /** List agents by status */
  listByStatus(status: AgentStatus): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((t) => t.agent.status === status)
      .map((t) => t.agent.getStatus());
  }

  /** List agents that have a specific capability/skill */
  listByCapability(skill: string): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((t) => t.agent.dna.skills.includes(skill))
      .map((t) => t.agent.getStatus());
  }

  /** List agents by category */
  listByCategory(category: AgentCategory): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((t) => t.agent.category === category)
      .map((t) => t.agent.getStatus());
  }

  /**
   * Spawn a new agent of the given type — LAZY LOADING
   * The instance is created on-demand with DNA defaults.
   * Target: < 500ms spawn time (lightweight object creation only).
   */
  spawn(type: ExtendedAgentType): BaseAgent {
    const factory = this.agentFactories.get(type);
    if (!factory) throw new Error(`Unknown agent type: ${type}`);
    const agent = factory();
    this.register(agent);
    return agent;
  }

  /**
   * Unload an agent by ID — explicit resource cleanup.
   * Returns true if the agent was found and unloaded.
   */
  unloadAgent(id: string): boolean {
    const tracked = this.agents.get(id);
    if (!tracked) return false;

    // Perform cleanup on the agent before removal
    tracked.agent.cleanup();
    this.agents.delete(id);
    return true;
  }

  /**
   * Get agent descriptor (metadata) WITHOUT spawning an instance.
   * This is the core lazy-loading feature — you can inspect agent
   * capabilities, tools, and system prompts without any allocation.
   */
  getAgentDescriptor(type: ExtendedAgentType): AgentDescriptor | undefined {
    return AGENT_DESCRIPTORS.get(type);
  }

  /**
   * Get all agent descriptors (metadata for the full library).
   * No instances are created.
   */
  getAllDescriptors(): AgentDescriptor[] {
    return Array.from(AGENT_DESCRIPTORS.values());
  }

  /**
   * Get descriptors by category.
   * No instances are created.
   */
  getDescriptorsByCategory(category: AgentCategory): AgentDescriptor[] {
    return Array.from(AGENT_DESCRIPTORS.values()).filter((d) => d.category === category);
  }

  /** Remove an agent by ID (alias for unloadAgent for backward compat) */
  remove(id: string): boolean {
    return this.unloadAgent(id);
  }

  /** Find the best agent for a given task based on DNA and experience */
  findBestForTask(task: string, preferredType?: ExtendedAgentType): BaseAgent | undefined {
    const candidates = Array.from(this.agents.values())
      .map((t) => {
        t.lastAccessedAt = Date.now();
        return t.agent;
      })
      .filter((a) => a.status === 'idle');

    if (candidates.length === 0) return undefined;

    // If a preferred type is specified, prefer agents of that type
    if (preferredType) {
      const typeMatches = candidates.filter((a) => a.type === preferredType);
      if (typeMatches.length > 0) {
        return this.rankAgents(typeMatches, task);
      }
    }

    // Score all idle agents based on experience, success rate, and relevance
    return this.rankAgents(candidates, task);
  }

  /** Rank agents and return the best one */
  private rankAgents(candidates: BaseAgent[], _task: string): BaseAgent {
    return candidates.sort((a, b) => {
      // Primary sort: experience score (experience * successRate)
      const scoreA = a.getExperienceScore();
      const scoreB = b.getExperienceScore();
      if (scoreB !== scoreA) return scoreB - scoreA;

      // Secondary sort: success rate
      if (b.dna.successRate !== a.dna.successRate) return b.dna.successRate - a.dna.successRate;

      // Tertiary sort: most recently active
      return b.lastActiveAt - a.lastActiveAt;
    })[0];
  }

  /**
   * Remove agents that have been idle past the timeout.
   * Enhanced: performs cleanup() on each agent before removal.
   */
  removeIdleAgents(timeoutMs: number = this.idleTimeoutMs): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, tracked] of this.agents.entries()) {
      if (tracked.agent.status === 'idle' && now - tracked.lastAccessedAt > timeoutMs) {
        tracked.agent.cleanup();
        this.agents.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /** Get aggregate statistics about all agents */
  getStatistics(): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    avgExperience: number;
    avgSuccessRate: number;
    totalTasksCompleted: number;
    descriptorCount: number;
  } {
    const agents = Array.from(this.agents.values()).map((t) => t.agent);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalExperience = 0;
    let totalSuccessRate = 0;
    let totalTasksCompleted = 0;

    for (const agent of agents) {
      byType[agent.type] = (byType[agent.type] ?? 0) + 1;
      byStatus[agent.status] = (byStatus[agent.status] ?? 0) + 1;
      byCategory[agent.category] = (byCategory[agent.category] ?? 0) + 1;
      totalExperience += agent.dna.experience;
      totalSuccessRate += agent.dna.successRate;
      totalTasksCompleted += agent.dna.experience;
    }

    const count = agents.length || 1; // avoid divide by zero

    return {
      total: agents.length,
      byType,
      byStatus,
      byCategory,
      avgExperience: totalExperience / count,
      avgSuccessRate: totalSuccessRate / count,
      totalTasksCompleted,
      descriptorCount: AGENT_DESCRIPTORS.size,
    };
  }

  /** Get all supported agent types */
  getSupportedTypes(): ExtendedAgentType[] {
    return Array.from(this.agentFactories.keys());
  }

  /** Get all supported categories */
  getSupportedCategories(): AgentCategory[] {
    const categories = new Set<AgentCategory>(
      Array.from(AGENT_DESCRIPTORS.values()).map((d) => d.category)
    );
    return Array.from(categories);
  }

  /** Get skills for an agent type (from descriptor, no instance needed) */
  getSkillsForType(type: ExtendedAgentType): string[] {
    const descriptor = AGENT_DESCRIPTORS.get(type);
    return descriptor?.skills ?? AGENT_SKILLS[type] ?? [];
  }

  /** Get tools for an agent type (from descriptor, no instance needed) */
  getToolsForType(type: ExtendedAgentType): string[] {
    const descriptor = AGENT_DESCRIPTORS.get(type);
    return descriptor?.tools ?? AGENT_TOOLS[type] ?? [];
  }

  /** Get system prompt for an agent type (from descriptor, no instance needed) */
  getSystemPromptForType(type: ExtendedAgentType): string {
    const descriptor = AGENT_DESCRIPTORS.get(type);
    return descriptor?.systemPrompt ?? AGENT_SYSTEM_PROMPTS[type] ?? '';
  }

  /** Get category for an agent type */
  getCategoryForType(type: ExtendedAgentType): AgentCategory {
    return AGENT_CATEGORIES[type];
  }
}

export const agentRegistry = new AgentRegistry();

export {
  BaseAgent,
  GenericAgent,
  // Backward-compatible named agent classes
  PlannerAgent,
  ArchitectAgent,
  ResearcherAgent,
  CoderAgent,
  ReviewerAgent,
  VerifierAgent,
  MemoryAgent,
  DevOpsAgent,
  SecurityAgent,
  TestingAgent,
  UIUXAgent,
  SEOAgent,
  AutomationAgent,
  BusinessAgent,
  RecruitmentAgent,
  AviationAgent,
  DatabaseAgent,
  DocumentationAgent,
  DeploymentAgent,
  // New agent classes
  CEOAgent,
  CTOAgent,
  ProductManagerAgent,
  BackendAgent,
  FrontendAgent,
  FullStackAgent,
  CloudAgent,
  CodeReviewAgent,
  FactVerificationAgent,
  MarketIntelligenceAgent,
  CompetitorAnalysisAgent,
  HRAgent,
  CRMAgent,
  SalesAgent,
  MarketingAgent,
  ContentAgent,
  DataAnalystAgent,
  ETLAgent,
  BIAgent,
  ReportingAgent,
  KnowledgeAgent,
  RAGAgent,
  GraphAgent,
  AuditAgent,
  ComplianceAgent,
  ThreatDetectionAgent,
  WorkflowAgent,
  SchedulerAgent,
  IntegrationAgent,
  GitHubAgent,
  DockerAgent,
  KubernetesAgent,
  CloudflareAgent,
  WordPressAgent,
  MoodleAgent,
  PromptEngineeringAgent,
  ModelOptimizationAgent,
  SwarmOptimizationAgent,
  BrainOptimizationAgent,
  VoiceAgent,
  VisionAgent,
  MeetingAgent,
  BrowserAgent,
  ComputerUseAgent,
  AirlineRecruitmentAgent,
  AviationTrainingAgent,
  FinancialAnalysisAgent,
  LegalResearchAgent,
  ProcurementAgent,
  CustomerSuccessAgent,
  StrategicPlanningAgent,
  // Maps
  AGENT_SKILLS,
  AGENT_TOOLS,
  AGENT_SYSTEM_PROMPTS,
  AGENT_NAMES,
  AGENT_CATEGORIES,
  AGENT_DESCRIPTORS,
  AGENT_FACTORIES,
};
