import fs from "fs";
import path from "path";

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  defaultBranch: string;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  isFork: boolean;
  updatedAt: string;
  size: number;
  files?: string[];
  readmeExcerpt?: string;
}

export interface FetchFileResult {
  content: string;
  filePath: string;
  repo: string;
  url: string;
  isTruncated: boolean;
  byteSize: number;
}

export interface GitHubCommitActivity {
  sha: string;
  repo: string;
  message: string;
  date: string;
  author: string;
  url: string;
}

export class GitHubService {
  private username: string;
  private token?: string;
  private cacheDir: string;
  private reposCache: GitHubRepo[] = [];
  private reposCacheTime = 0;
  private readonly REPOS_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly TREE_TTL = 30 * 60 * 1000; // 30 minutes
  private treeCache = new Map<string, { files: string[]; timestamp: number }>();
  private fileContentCache = new Map<string, { content: string; timestamp: number }>();
  private readmeCache = new Map<string, { content: string; timestamp: number }>();

  constructor(options?: { username?: string; token?: string; cacheDir?: string }) {
    this.username = (options?.username || process.env.GITHUB_USERNAME || "umeshkumarsahoo").trim();
    const rawToken = options?.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || process.env.GH_TOKEN;
    this.token = rawToken ? rawToken.trim().replace(/^["']|["']$/g, "") : undefined;
    this.cacheDir = options?.cacheDir || path.join(process.cwd(), ".github_cache");

    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch {}

    this.loadDiskCaches();
    if (this.reposCache.length === 0) {
      this.seedDefaultCatalogue();
    }
  }

  private seedDefaultCatalogue() {
    this.reposCache = [
      {
        name: "lab_project_fresh_guard",
        fullName: "umeshkumarsahoo/lab_project_fresh_guard",
        description: "Produce shelf-life predictor using GradientBoostingRegressor on 3,552 records across 9 features with Flask API.",
        htmlUrl: "https://github.com/umeshkumarsahoo/lab_project_fresh_guard",
        defaultBranch: "main",
        language: "Python",
        topics: ["machine-learning", "regression", "flask", "scikit-learn"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-03-15T00:00:00Z",
        size: 4500,
        files: ["app.py", "best_regressor.pkl", "Datasets/FreshGuard_RAW_dirty.csv", "classifier_xgboost.pkl", "FreshGuard.ipynb", "requirements.txt", "README.md"],
      },
      {
        name: "Teaching_assistant-rag-based-",
        fullName: "umeshkumarsahoo/Teaching_assistant-rag-based-",
        description: "Video RAG system transcribing lectures via Whisper large-v2 and indexing dense vector embeddings with Streamlit UI.",
        htmlUrl: "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-",
        defaultBranch: "main",
        language: "Python",
        topics: ["rag", "whisper", "vector-search", "streamlit", "embeddings"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-03-10T00:00:00Z",
        size: 3200,
        files: ["create_chunks.py", "APP.PY", "api.py", "process_video.py", "After_chunking.ipynb", "process_incoming.ipynb", "requirements.txt", "Readme.md"],
      },
      {
        name: "Time_series-",
        fullName: "umeshkumarsahoo/Time_series-",
        description: "Time series forecasting on Nifty-50 stock market data using ARIMA, pmdarima, and Keras LSTM RNNs.",
        htmlUrl: "https://github.com/umeshkumarsahoo/Time_series-",
        defaultBranch: "main",
        language: "Jupyter Notebook",
        topics: ["time-series", "arima", "lstm", "nifty-50"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-02-20T00:00:00Z",
        size: 1800,
        files: ["lstm-rnn-arimax-ar-models-and-analysis.ipynb", "README.md"],
      },
      {
        name: "ecommerce_advance",
        fullName: "umeshkumarsahoo/ecommerce_advance",
        description: "Full-stack e-commerce web platform featuring Express REST API routes, MongoDB User/Order models, and authentication.",
        htmlUrl: "https://github.com/umeshkumarsahoo/ecommerce_advance",
        defaultBranch: "main",
        language: "JavaScript",
        topics: ["react", "express", "mongodb", "nodejs", "e-commerce"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-02-10T00:00:00Z",
        size: 5000,
        files: ["backend/routes/auth.js", "backend/routes/orders.js", "backend/routes/products.js", "backend/models/User.js", "backend/models/Order.js", "backend/models/Product.js", "package.json"],
      },
      {
        name: "devops-umesh",
        fullName: "umeshkumarsahoo/devops-umesh",
        description: "DevOps & Cloud architecture repository with Dockerfiles, AWS deployment configs, and CI/CD pipelines.",
        htmlUrl: "https://github.com/umeshkumarsahoo/devops-umesh",
        defaultBranch: "main",
        language: "HCL",
        topics: ["devops", "docker", "aws", "terraform", "ci-cd"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-02-05T00:00:00Z",
        size: 1200,
        files: ["Dockerfile", "docker-compose.yml", "examples/appspec.yml", "examples/buildspec.yml", "k8s/deployment.yaml", "README.md"],
      },
      {
        name: "sentiment_analysis",
        fullName: "umeshkumarsahoo/sentiment_analysis",
        description: "BiGRU text emotion classifier in Keras/TensorFlow served via FastAPI microservice.",
        htmlUrl: "https://github.com/umeshkumarsahoo/sentiment_analysis",
        defaultBranch: "main",
        language: "Python",
        topics: ["nlp", "bigru", "keras", "fastapi", "sentiment-analysis"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-02-15T00:00:00Z",
        size: 0,
        files: [],
      },
      {
        name: "portfolio_",
        fullName: "umeshkumarsahoo/portfolio_",
        description: "Minimalist editorial portfolio with dual-persona AI assistant, live GitHub integration, and security controls.",
        htmlUrl: "https://github.com/umeshkumarsahoo/portfolio_",
        defaultBranch: "main",
        language: "TypeScript",
        topics: ["portfolio", "react", "vite", "typescript", "express", "rag"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-03-20T00:00:00Z",
        size: 3000,
        files: ["server.ts", "ragEngine.ts", "githubService.ts", "package.json", "README.md"],
      },
      {
        name: "water-borne",
        fullName: "umeshkumarsahoo/water-borne",
        description: "Water quality prediction and water-borne disease analysis machine learning system.",
        htmlUrl: "https://github.com/umeshkumarsahoo/water-borne",
        defaultBranch: "main",
        language: "JavaScript",
        topics: ["machine-learning", "water-quality", "disease-prediction"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-01-25T00:00:00Z",
        size: 2100,
      },
      {
        name: "spec2model",
        fullName: "umeshkumarsahoo/spec2model",
        description: "Runner-Up in SPEC2MODEL ML Competition. Delivery delay forecasting using XGBoost and feature engineering.",
        htmlUrl: "https://github.com/umeshkumarsahoo/spec2model",
        defaultBranch: "main",
        language: "Jupyter Notebook",
        topics: ["xgboost", "machine-learning", "competition"],
        stars: 0,
        forks: 0,
        isFork: true,
        updatedAt: "2026-01-10T00:00:00Z",
        size: 1500,
      },
      {
        name: "aws",
        fullName: "umeshkumarsahoo/aws",
        description: "AWS cloud configuration, IAM policies, and cloud infrastructure scripts.",
        htmlUrl: "https://github.com/umeshkumarsahoo/aws",
        defaultBranch: "main",
        language: "Shell",
        topics: ["aws", "cloud", "iam"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-01-15T00:00:00Z",
        size: 800,
      },
      {
        name: "leet-code-daily",
        fullName: "umeshkumarsahoo/leet-code-daily",
        description: "Daily competitive programming and algorithmic problem solutions in Python and C.",
        htmlUrl: "https://github.com/umeshkumarsahoo/leet-code-daily",
        defaultBranch: "main",
        language: "Python",
        topics: ["algorithms", "leetcode", "data-structures"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-03-01T00:00:00Z",
        size: 900,
      },
      {
        name: "MERN-STACK-",
        fullName: "umeshkumarsahoo/MERN-STACK-",
        description: "Full-stack MERN (MongoDB, Express, React, Node.js) practice applications and components.",
        htmlUrl: "https://github.com/umeshkumarsahoo/MERN-STACK-",
        defaultBranch: "main",
        language: "HTML",
        topics: ["mern", "react", "nodejs"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-01-20T00:00:00Z",
        size: 1100,
      },
      {
        name: "ml-projects",
        fullName: "umeshkumarsahoo/ml-projects",
        description: "Machine learning laboratory experiments and model evaluations in scikit-learn and TensorFlow.",
        htmlUrl: "https://github.com/umeshkumarsahoo/ml-projects",
        defaultBranch: "main",
        language: "Jupyter Notebook",
        topics: ["machine-learning", "scikit-learn"],
        stars: 1,
        forks: 0,
        isFork: false,
        updatedAt: "2026-01-18T00:00:00Z",
        size: 2400,
      },
      {
        name: "python",
        fullName: "umeshkumarsahoo/python",
        description: "Python foundational scripts, utilities, and automation tools.",
        htmlUrl: "https://github.com/umeshkumarsahoo/python",
        defaultBranch: "main",
        language: "Python",
        topics: ["python"],
        stars: 1,
        forks: 0,
        isFork: false,
        updatedAt: "2026-01-05T00:00:00Z",
        size: 600,
      },
      {
        name: "To-do-",
        fullName: "umeshkumarsahoo/To-do-",
        description: "Interactive task manager web application.",
        htmlUrl: "https://github.com/umeshkumarsahoo/To-do-",
        defaultBranch: "main",
        language: "JavaScript",
        topics: ["javascript", "todo"],
        stars: 1,
        forks: 0,
        isFork: false,
        updatedAt: "2026-01-08T00:00:00Z",
        size: 400,
      },
      {
        name: "tata",
        fullName: "umeshkumarsahoo/tata",
        description: "Data visualization and exploratory data analysis project.",
        htmlUrl: "https://github.com/umeshkumarsahoo/tata",
        defaultBranch: "main",
        language: "JavaScript",
        topics: ["data-analysis"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2026-01-02T00:00:00Z",
        size: 500,
      },
      {
        name: "calculator",
        fullName: "umeshkumarsahoo/calculator",
        description: "Clean browser-based calculator implementation.",
        htmlUrl: "https://github.com/umeshkumarsahoo/calculator",
        defaultBranch: "main",
        language: "JavaScript",
        topics: ["javascript"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2025-12-15T00:00:00Z",
        size: 300,
      },
      {
        name: "bday",
        fullName: "umeshkumarsahoo/bday",
        description: "Interactive celebration web page.",
        htmlUrl: "https://github.com/umeshkumarsahoo/bday",
        defaultBranch: "main",
        language: "HTML",
        topics: ["html", "css"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2025-12-01T00:00:00Z",
        size: 200,
      },
      {
        name: "first-web",
        fullName: "umeshkumarsahoo/first-web",
        description: "Introductory web development project.",
        htmlUrl: "https://github.com/umeshkumarsahoo/first-web",
        defaultBranch: "main",
        language: "HTML",
        topics: ["html"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2025-11-20T00:00:00Z",
        size: 150,
      },
      {
        name: "git1",
        fullName: "umeshkumarsahoo/git1",
        description: "C programming practice exercises.",
        htmlUrl: "https://github.com/umeshkumarsahoo/git1",
        defaultBranch: "main",
        language: "C",
        topics: ["c"],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2025-11-10T00:00:00Z",
        size: 100,
      },
      {
        name: "assignments",
        fullName: "umeshkumarsahoo/assignments",
        description: "Academic coursework and lab assignments.",
        htmlUrl: "https://github.com/umeshkumarsahoo/assignments",
        defaultBranch: "main",
        language: null,
        topics: [],
        stars: 0,
        forks: 0,
        isFork: true,
        updatedAt: "2025-11-05T00:00:00Z",
        size: 350,
      },
      {
        name: "assingment2-submission",
        fullName: "umeshkumarsahoo/assingment2-submission",
        description: "Data science assignment submission notebook.",
        htmlUrl: "https://github.com/umeshkumarsahoo/assingment2-submission",
        defaultBranch: "main",
        language: "Jupyter Notebook",
        topics: [],
        stars: 1,
        forks: 0,
        isFork: false,
        updatedAt: "2025-11-01T00:00:00Z",
        size: 800,
      },
      {
        name: "awesome-github-profile-readme-templates",
        fullName: "umeshkumarsahoo/awesome-github-profile-readme-templates",
        description: "Curated collection of README templates.",
        htmlUrl: "https://github.com/umeshkumarsahoo/awesome-github-profile-readme-templates",
        defaultBranch: "master",
        language: null,
        topics: [],
        stars: 0,
        forks: 0,
        isFork: true,
        updatedAt: "2025-10-25T00:00:00Z",
        size: 5000,
      },
      {
        name: "docs",
        fullName: "umeshkumarsahoo/docs",
        description: "Documentation templates and resources.",
        htmlUrl: "https://github.com/umeshkumarsahoo/docs",
        defaultBranch: "main",
        language: null,
        topics: [],
        stars: 0,
        forks: 0,
        isFork: true,
        updatedAt: "2025-10-20T00:00:00Z",
        size: 2000,
      },
      {
        name: "HAPPY-BIRTHDAY-resh",
        fullName: "umeshkumarsahoo/HAPPY-BIRTHDAY-resh",
        description: "CSS animation greeting page.",
        htmlUrl: "https://github.com/umeshkumarsahoo/HAPPY-BIRTHDAY-resh",
        defaultBranch: "main",
        language: "CSS",
        topics: [],
        stars: 0,
        forks: 0,
        isFork: true,
        updatedAt: "2025-10-15T00:00:00Z",
        size: 300,
      },
      {
        name: "hlo-resh",
        fullName: "umeshkumarsahoo/hlo-resh",
        description: "Web design experiment.",
        htmlUrl: "https://github.com/umeshkumarsahoo/hlo-resh",
        defaultBranch: "main",
        language: null,
        topics: [],
        stars: 0,
        forks: 0,
        isFork: true,
        updatedAt: "2025-10-10T00:00:00Z",
        size: 200,
      },
      {
        name: "portfolio",
        fullName: "umeshkumarsahoo/portfolio",
        description: "Initial portfolio concept.",
        htmlUrl: "https://github.com/umeshkumarsahoo/portfolio",
        defaultBranch: "main",
        language: null,
        topics: [],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2025-10-05T00:00:00Z",
        size: 400,
      },
      {
        name: "small-projects",
        fullName: "umeshkumarsahoo/small-projects",
        description: "Collection of mini programming utilities in Python.",
        htmlUrl: "https://github.com/umeshkumarsahoo/small-projects",
        defaultBranch: "main",
        language: "Python",
        topics: ["python"],
        stars: 1,
        forks: 0,
        isFork: false,
        updatedAt: "2025-09-20T00:00:00Z",
        size: 700,
      },
      {
        name: "umesh3939",
        fullName: "umeshkumarsahoo/umesh3939",
        description: "Specialized Python algorithms.",
        htmlUrl: "https://github.com/umeshkumarsahoo/umesh3939",
        defaultBranch: "main",
        language: "Python",
        topics: [],
        stars: 1,
        forks: 0,
        isFork: true,
        updatedAt: "2025-09-15T00:00:00Z",
        size: 500,
      },
      {
        name: "umeshkumarsahoo",
        fullName: "umeshkumarsahoo/umeshkumarsahoo",
        description: "GitHub profile configuration repository.",
        htmlUrl: "https://github.com/umeshkumarsahoo/umeshkumarsahoo",
        defaultBranch: "main",
        language: null,
        topics: [],
        stars: 0,
        forks: 0,
        isFork: false,
        updatedAt: "2025-09-10T00:00:00Z",
        size: 100,
      },
    ];
  }

  private loadDiskCaches() {
    try {
      const reposFile = path.join(this.cacheDir, "repos.json");
      if (fs.existsSync(reposFile)) {
        const raw = fs.readFileSync(reposFile, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.reposCache = parsed;
          this.reposCacheTime = Date.now();
        }
      }
    } catch {}
  }

  private saveReposDiskCache() {
    try {
      const reposFile = path.join(this.cacheDir, "repos.json");
      fs.writeFileSync(reposFile, JSON.stringify(this.reposCache, null, 2), "utf-8");
    } catch {}
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "Retro-Terminal-Portfolio-Agent",
      "Accept": "application/vnd.github.v3+json",
    };

    if (this.token) {
      headers["Authorization"] = this.token.startsWith("token ") || this.token.startsWith("Bearer ")
        ? this.token
        : `token ${this.token}`;
    }

    return headers;
  }

  /**
   * Fetches all repositories for the configured username using pagination.
   */
  public async fetchRepositories(forceRefresh = false): Promise<GitHubRepo[]> {
    const now = Date.now();
    if (!forceRefresh && this.reposCache.length > 0 && now - this.reposCacheTime < this.REPOS_TTL) {
      return this.reposCache;
    }

    try {
      console.log(`[GITHUB] Fetching repositories for ${this.username} from GitHub REST API...`);
      const headers = this.getHeaders();
      let page = 1;
      const allFetched: any[] = [];

      while (true) {
        const pageUrl = `https://api.github.com/users/${this.username}/repos?sort=updated&per_page=100&page=${page}`;
        let res = await fetch(pageUrl, { headers, signal: AbortSignal.timeout(8000) });

        if (!res.ok && (res.status === 401 || res.status === 403) && headers["Authorization"]) {
          console.warn(`[GITHUB] Token returned HTTP ${res.status}. Retrying unauthenticated...`);
          delete headers["Authorization"];
          res = await fetch(pageUrl, { headers, signal: AbortSignal.timeout(8000) });
        }

        if (!res.ok) {
          if (page === 1) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
          break;
        }

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        allFetched.push(...data);
        if (data.length < 100) break;
        page++;
      }

      const repos: GitHubRepo[] = allFetched.map((r: any) => ({
        name: r.name,
        fullName: r.full_name || `${this.username}/${r.name}`,
        description: r.description || null,
        htmlUrl: r.html_url,
        defaultBranch: r.default_branch || "main",
        language: r.language || null,
        topics: Array.isArray(r.topics) ? r.topics : [],
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        isFork: Boolean(r.fork),
        updatedAt: r.updated_at || new Date().toISOString(),
        size: r.size || 0,
      }));

      if (repos.length > 0) {
        this.reposCache = repos;
        this.reposCacheTime = now;
        this.saveReposDiskCache();
        console.log(`[GITHUB] Successfully discovered and cached ${repos.length} repositories.`);
      }

      return this.reposCache;
    } catch (err: any) {
      console.warn(`[GITHUB] Notice fetching live GitHub repos: ${err.message}. Using cache.`);
      return this.reposCache;
    }
  }

  /**
   * Fetches recursive git tree for a repository to discover all source files.
   */
  public async fetchRepoTree(repoName: string, branch = "main"): Promise<string[]> {
    const key = `${repoName}:${branch}`;
    const cached = this.treeCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.TREE_TTL) {
      return cached.files;
    }

    try {
      const headers = this.getHeaders();
      const url = `https://api.github.com/repos/${this.username}/${repoName}/git/trees/${branch}?recursive=1`;
      let res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });

      if (!res.ok && branch === "main") {
        // Retry with master branch
        res = await fetch(
          `https://api.github.com/repos/${this.username}/${repoName}/git/trees/master?recursive=1`,
          { headers, signal: AbortSignal.timeout(6000) }
        );
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tree)) {
          const files = data.tree
            .filter((item: any) => item.type === "blob")
            .map((item: any) => item.path as string)
            .filter((p: string) => {
              const lower = p.toLowerCase();
              if (lower.startsWith(".") && !lower.startsWith(".github")) return false;
              if (lower.includes("node_modules/") || lower.includes("dist/") || lower.includes("build/")) return false;
              return !lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".pkl") && !lower.endsWith(".ico");
            });

          this.treeCache.set(key, { files, timestamp: Date.now() });
          return files;
        }
      }
    } catch (err) {
      console.warn(`[GITHUB] Tree fetch notice for ${repoName}:`, (err as any)?.message || err);
    }

    return cached ? cached.files : [];
  }

  /**
   * Fetches README content for a repository directly via GitHub API.
   */
  public async fetchRepoReadme(repoName: string): Promise<string> {
    const cached = this.readmeCache.get(repoName);
    if (cached && Date.now() - cached.timestamp < this.TREE_TTL) {
      return cached.content;
    }

    try {
      const headers = {
        ...this.getHeaders(),
        "Accept": "application/vnd.github.v3.raw",
      };
      const url = `https://api.github.com/repos/${this.username}/${repoName}/readme`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });

      if (res.ok) {
        let text = await res.text();
        if (text.length > 5000) {
          text = text.substring(0, 5000) + "\n\n[README TRUNCATED FOR LENGTH]";
        }
        this.readmeCache.set(repoName, { content: text, timestamp: Date.now() });
        return text;
      }

      // CDN fallback
      const cdnUrl = `https://raw.githubusercontent.com/${this.username}/${repoName}/main/README.md`;
      const cdnRes = await fetch(cdnUrl, { signal: AbortSignal.timeout(4000) });
      if (cdnRes.ok) {
        const text = await cdnRes.text();
        this.readmeCache.set(repoName, { content: text, timestamp: Date.now() });
        return text;
      }
    } catch {}

    return cached ? cached.content : "";
  }

  /**
   * Fetches raw source code file content directly from GitHub REST API with CDN fallback.
   */
  public async fetchRawFile(repoName: string, filePath: string, branch = "main"): Promise<FetchFileResult | null> {
    const cacheKey = `${repoName}:${filePath}`;
    const cached = this.fileContentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.TREE_TTL) {
      return {
        content: cached.content,
        filePath,
        repo: repoName,
        url: `https://github.com/${this.username}/${repoName}/blob/${branch}/${filePath}`,
        isTruncated: false,
        byteSize: Buffer.byteLength(cached.content, "utf-8"),
      };
    }

    // 1. Try GitHub API contents endpoint with raw header
    try {
      const headers = {
        ...this.getHeaders(),
        "Accept": "application/vnd.github.v3.raw",
      };
      const apiUrl = `https://api.github.com/repos/${this.username}/${repoName}/contents/${filePath}`;
      const res = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(6000) });

      if (res.ok) {
        const content = await res.text();
        this.fileContentCache.set(cacheKey, { content, timestamp: Date.now() });
        return {
          content,
          filePath,
          repo: repoName,
          url: `https://github.com/${this.username}/${repoName}/blob/${branch}/${filePath}`,
          isTruncated: false,
          byteSize: Buffer.byteLength(content, "utf-8"),
        };
      }
    } catch (err) {
      console.warn(`[GITHUB] API raw file fetch notice for ${repoName}/${filePath}:`, (err as any)?.message || err);
    }

    // 2. Fallback to raw.githubusercontent.com CDN (unlimited public rate limit)
    for (const b of [branch, "main", "master"]) {
      try {
        const cdnUrl = `https://raw.githubusercontent.com/${this.username}/${repoName}/${b}/${filePath}`;
        const cdnRes = await fetch(cdnUrl, { signal: AbortSignal.timeout(5000) });
        if (cdnRes.ok) {
          const content = await cdnRes.text();
          this.fileContentCache.set(cacheKey, { content, timestamp: Date.now() });
          return {
            content,
            filePath,
            repo: repoName,
            url: `https://github.com/${this.username}/${repoName}/blob/${b}/${filePath}`,
            isTruncated: false,
            byteSize: Buffer.byteLength(content, "utf-8"),
          };
        }
      } catch {}
    }

    return null;
  }

  /**
   * Finds the best matching file in a repository given a filename or search term.
   */
  public async findFileInRepo(repoName: string, query: string): Promise<string | null> {
    const files = await this.fetchRepoTree(repoName);
    if (!files || files.length === 0) return null;

    const q = query.toLowerCase().trim();

    // Exact match
    const exact = files.find((f) => f.toLowerCase() === q || path.basename(f).toLowerCase() === q);
    if (exact) return exact;

    // Stem / partial match
    const cleanQ = q.replace(/\.[a-z0-9]+$/i, "");
    const matching = files.find((f) => {
      const base = path.basename(f).toLowerCase();
      return base.includes(cleanQ) || f.toLowerCase().includes(q);
    });

    return matching || null;
  }

  /**
   * Resolves target repository from query text or recent conversation history.
   */
  public resolveRepoForQuery(query: string, history?: { role: string; content: string }[]): string | null {
    const q = query.toLowerCase();

    // Direct mappings
    if (q.includes("freshguard") || q.includes("fresh guard") || q.includes("shelf life") || q.includes("produce")) {
      return "lab_project_fresh_guard";
    }
    if (
      q.includes("rag") ||
      q.includes("teaching assistant") ||
      q.includes("create_chunks") ||
      q.includes("whisper") ||
      q.includes("video lecture")
    ) {
      return "Teaching_assistant-rag-based-";
    }
    if (q.includes("time series") || q.includes("timeseries") || q.includes("nifty") || q.includes("arima")) {
      return "Time_series-";
    }
    if (
      q.includes("ecommerce") ||
      q.includes("e-commerce") ||
      (q.includes("auth") && (q.includes("register") || q.includes("login") || q.includes("route") || q.includes("user")))
    ) {
      return "ecommerce_advance";
    }
    if (q.includes("sentiment") || q.includes("emotion") || q.includes("bigru")) {
      return "sentiment_analysis";
    }
    if (q.includes("devops") || q.includes("terraform") || q.includes("docker")) {
      return "devops-umesh";
    }
    if (q.includes("water-borne") || q.includes("waterborne")) {
      return "water-borne";
    }
    if (q.includes("spec2model")) {
      return "spec2model";
    }
    if (q.includes("portfolio")) {
      return "portfolio_";
    }

    // Match by known repository names
    for (const repo of this.reposCache) {
      if (q.includes(repo.name.toLowerCase())) {
        return repo.name;
      }
    }

    // Follow-up resolution from history
    if (history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const prev = history[i].content.toLowerCase();
        if (prev.includes("freshguard") || prev.includes("lab_project_fresh_guard")) {
          return "lab_project_fresh_guard";
        }
        if (prev.includes("teaching assistant") || prev.includes("teaching_assistant") || prev.includes("rag")) {
          return "Teaching_assistant-rag-based-";
        }
        if (prev.includes("time series") || prev.includes("time_series")) {
          return "Time_series-";
        }
        if (prev.includes("ecommerce") || prev.includes("ecommerce_advance")) {
          return "ecommerce_advance";
        }
        if (prev.includes("devops")) {
          return "devops-umesh";
        }
      }
    }

    return null;
  }

  /**
   * Fetches recent commits across primary repositories with local disk caching.
   */
  public async fetchRecentCommits(forceRefresh = false): Promise<GitHubCommitActivity[]> {
    const commitsFile = path.join(this.cacheDir, "commits.json");
    const now = Date.now();

    if (!forceRefresh && fs.existsSync(commitsFile)) {
      try {
        const raw = fs.readFileSync(commitsFile, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.commits) && now - parsed.timestamp < 15 * 60 * 1000) {
          return parsed.commits;
        }
      } catch {}
    }

    const targetRepos = ["portfolio_", "lab_project_fresh_guard", "Teaching_assistant-rag-based-", "Time_series-"];
    const allCommits: GitHubCommitActivity[] = [];
    const headers = this.getHeaders();

    for (const repo of targetRepos) {
      try {
        const res = await fetch(`https://api.github.com/repos/${this.username}/${repo}/commits?per_page=5`, {
          headers,
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            for (const item of list) {
              allCommits.push({
                sha: (item.sha || "").substring(0, 7),
                repo,
                message: item.commit?.message?.split("\n")[0] || "Update codebase",
                date: item.commit?.author?.date || item.commit?.committer?.date || new Date().toISOString(),
                author: item.commit?.author?.name || "Umesh Kumar Sahoo",
                url: item.html_url || `https://github.com/${this.username}/${repo}/commit/${item.sha}`,
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`[GITHUB] Notice fetching commits for ${repo}:`, err.message);
      }
    }

    allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Robust fallback if GitHub API was unauthenticated/rate-limited
    if (allCommits.length === 0) {
      allCommits.push(
        {
          sha: "58ebb78",
          repo: "portfolio_",
          message: "feat(umu-agent): add conversational email workflow and simple agent mode",
          date: "2026-10-21T04:30:53Z",
          author: "Umesh Kumar Sahoo",
          url: "https://github.com/umeshkumarsahoo/portfolio_/commit/58ebb78",
        },
        {
          sha: "3c384bc",
          repo: "portfolio_",
          message: "feat(agent): dynamic GitHub API file & code retrieval engine with multi-model Gemini execution",
          date: "2026-10-20T22:15:00Z",
          author: "Umesh Kumar Sahoo",
          url: "https://github.com/umeshkumarsahoo/portfolio_/commit/3c384bc",
        },
        {
          sha: "4294e6c",
          repo: "portfolio_",
          message: "Fix: Move health check before CSRF middleware so Render deploy succeeds",
          date: "2026-07-15T15:11:07Z",
          author: "Umesh Kumar Sahoo",
          url: "https://github.com/umeshkumarsahoo/portfolio_/commit/4294e6c",
        },
        {
          sha: "a81d49e",
          repo: "lab_project_fresh_guard",
          message: "feat: GradientBoostingRegressor produce shelf-life evaluation pipeline and Flask API",
          date: "2026-03-15T12:00:00Z",
          author: "Umesh Kumar Sahoo",
          url: "https://github.com/umeshkumarsahoo/lab_project_fresh_guard",
        },
        {
          sha: "c389f10",
          repo: "Teaching_assistant-rag-based-",
          message: "feat: Whisper lecture transcription and sliding-window semantic chunker create_chunks.py",
          date: "2026-03-10T16:30:00Z",
          author: "Umesh Kumar Sahoo",
          url: "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-",
        }
      );
    }

    try {
      fs.writeFileSync(commitsFile, JSON.stringify({ commits: allCommits, timestamp: now }, null, 2), "utf-8");
    } catch {}

    return allCommits;
  }
}

export const githubService = new GitHubService();
