const fs = require('fs');

let code = fs.readFileSync('src/lib/dream-job/gap-engine.ts', 'utf8');

const target = `  // Cloud & DevOps
  if (["cloud", "aws", "azure", "gcp", "kubernetes", "docker", "terraform", "devops", "ci cd", "pipeline"].some((k) => n.includes(k))) {
    return {
      project: \`Build and deploy a scalable infrastructure for a \${ind} application using \${label}\`,
      deliverables: [\`A live, publicly accessible deployment simulating a \${ind} workload\`, "A README documenting the deployment pipeline and security choices", "A short write-up on architecture trade-offs"],
      skillsDemonstrated: [skillName, "Deployment pipelines", "Infrastructure as code"],
    };
  }
  
  // Data Science & ML
  if (["machine learning", "deep learning", "data science", "nlp", "computer vision", "llm", "ai", "pandas", "pytorch", "tensorflow"].some((k) => n.includes(k))) {
    return {
      project: \`Analyze a \${ind} dataset or build a predictive model using \${label}\`,
      deliverables: [\`A working Jupyter notebook or repo analyzing \${ind} trends\`, "A short executive summary reporting the business impact of the results", "A public repo link for your portfolio"],
      skillsDemonstrated: [skillName, "Data modeling", "Technical communication"],
    };
  }
  
  // Data Engineering & Backend
  if (["data engineering", "sql", "postgresql", "mongodb", "database", "api", "node.js", "django", "spring", "microservices", "kafka"].some((k) => n.includes(k))) {
    return {
      project: \`Design a high-throughput backend service or data pipeline for a \${ind} platform using \${label}\`,
      deliverables: [\`A GitHub repo with a working API or pipeline handling mock \${ind} data\`, "Documentation covering the schema design and performance considerations", "A postman collection or test suite"],
      skillsDemonstrated: [skillName, "System architecture", "Data handling"],
    };
  }
  
  // Frontend
  if (["frontend", "react", "vue", "angular", "css", "html", "javascript", "typescript", "ui", "ux", "tailwind", "next.js"].some((k) => n.includes(k))) {
    return {
      project: \`Develop a responsive, accessible \${ind} web interface using \${label}\`,
      deliverables: [\`A live hosted web app tailored to \${ind} users\`, "Lighthouse scores proving >90% on performance and accessibility", "Component documentation or Storybook"],
      skillsDemonstrated: [skillName, "Responsive design", "Web performance"],
    };
  }
  
  // Generic Fallback
  return {
    project: \`Execute a \${ind}-focused project demonstrating \${label}\`,
    deliverables: [\`A completed case study, repo, or document showing your work with \${label}\`, "A summary of how this maps to your target role's core responsibilities"],
    skillsDemonstrated: [skillName, "Self-directed learning"],
  };`;

const replacement = `  // Cloud & DevOps
  if (["cloud", "aws", "azure", "gcp", "kubernetes", "docker", "terraform", "devops", "ci cd", "pipeline", "infrastructure"].some((k) => n.includes(k))) {
    return {
      project: \`Architect, Build, and Deploy a Production-Grade \${ind} Infrastructure using \${label}\`,
      deliverables: [
        \`Phase 1 (Design): A written architecture diagram (using Excalidraw/Lucidchart) mapping out VPCs, subnets, and load balancers for a \${ind} workload\`,
        \`Phase 2 (Implementation): Write Terraform/IaC scripts to provision the environment automatically without manual console clicking\`,
        \`Phase 3 (CI/CD & Security): Set up GitHub Actions to automatically deploy code to this environment, ensuring zero-downtime rollouts\`,
        \`Phase 4 (Documentation): A technical README detailing your cost-optimization strategy and security trade-offs\`
      ],
      skillsDemonstrated: [skillName, "Infrastructure as Code", "Continuous Deployment", "Cloud Security"],
    };
  }
  
  // Data Science, ML, AI
  if (["machine learning", "deep learning", "data science", "nlp", "computer vision", "llm", "ai", "pandas", "pytorch", "tensorflow", "scikit"].some((k) => n.includes(k))) {
    return {
      project: \`Train, Evaluate, and Serve a \${label} Predictive Model for \${ind} Analytics\`,
      deliverables: [
        \`Phase 1 (Data Prep): Find a raw \${ind} dataset on Kaggle/BigQuery, clean it, handle missing values, and perform exploratory data analysis (EDA)\`,
        \`Phase 2 (Modeling): Train at least 3 competing models using \${label}, comparing precision, recall, and F1 scores\`,
        \`Phase 3 (Deployment): Wrap the winning model in a FastAPI or Flask endpoint and containerize it with Docker\`,
        \`Phase 4 (Business Impact): Write a 1-page executive summary explaining how this model saves money or generates revenue for a \${ind} company\`
      ],
      skillsDemonstrated: [skillName, "Data Engineering", "Model Deployment", "Business Analytics"],
    };
  }
  
  // Data Engineering & Backend
  if (["data engineering", "sql", "postgresql", "mongodb", "database", "api", "node.js", "django", "spring", "microservices", "kafka", "redis"].some((k) => n.includes(k))) {
    return {
      project: \`Design and Build a High-Throughput \${label} Microservice for a \${ind} Platform\`,
      deliverables: [
        \`Phase 1 (Schema Design): Draft an entity-relationship diagram (ERD) optimized for read/write patterns typical in \${ind}\`,
        \`Phase 2 (API Development): Build a robust REST or GraphQL API using \${label}, implementing proper pagination, filtering, and error handling\`,
        \`Phase 3 (Optimization): Implement Redis caching and database indexing, proving performance gains via load testing (e.g. Apache JMeter or Artillery)\`,
        \`Phase 4 (Testing): Achieve >80% test coverage with unit and integration tests, running automatically in a CI pipeline\`
      ],
      skillsDemonstrated: [skillName, "System Architecture", "API Design", "Performance Tuning"],
    };
  }
  
  // Frontend & UI
  if (["frontend", "react", "vue", "angular", "css", "html", "javascript", "typescript", "ui", "ux", "tailwind", "next.js", "web"].some((k) => n.includes(k))) {
    return {
      project: \`Develop a Production-Ready, Accessible \${ind} Web Application using \${label}\`,
      deliverables: [
        \`Phase 1 (System Setup): Scaffold a modern application using \${label}, setting up strict TypeScript types and ESLint/Prettier formatting\`,
        \`Phase 2 (State Management): Build complex interactive components (like a \${ind} data dashboard or multi-step form) with robust global state\`,
        \`Phase 3 (Performance): Optimize bundle sizes, implement lazy loading, and achieve >95% Lighthouse scores across Performance and Accessibility\`,
        \`Phase 4 (Hosting): Deploy the application live to Vercel/Netlify with a custom domain, providing the public link on your resume\`
      ],
      skillsDemonstrated: [skillName, "State Management", "Web Accessibility (a11y)", "Performance Optimization"],
    };
  }
  
  // Generic Fallback
  return {
    project: \`Execute an End-to-End \${ind}-focused Capstone demonstrating \${label}\`,
    deliverables: [
      \`Phase 1 (Research): Identify a specific, expensive problem in the \${ind} sector that \${label} can solve\`,
      \`Phase 2 (Execution): Build a working prototype or deliverable that actively uses \${label} in a professional context\`,
      \`Phase 3 (Documentation): Create a comprehensive case study detailing the problem, your approach, and the exact business value generated\`
    ],
    skillsDemonstrated: [skillName, "Self-Directed Execution", "Business Acumen"],
  };`;

code = code.replace(target, replacement);

fs.writeFileSync('src/lib/dream-job/gap-engine.ts', code);
