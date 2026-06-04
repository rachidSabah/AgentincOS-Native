// ═══════════════════════════════════════════════════════
// AGENTIC OS — CI/CD + GitHub Deployment Engine
// Full pipeline orchestration: build, test, package, deploy
// with GitHub REST API integration (no SDK required)
// ═══════════════════════════════════════════════════════

import { zeroErrorEngine } from './zero-error-engine';
import { testingLayer } from './testing-layer';

// ─── Core Types ────────────────────────────────────────

/** A CI/CD pipeline with stages and status tracking */
export interface CICDPipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  status: 'pending' | 'building' | 'testing' | 'packaging' | 'deploying' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  artifactUrl?: string;
  repository?: string;
  version?: string;
}

/** A single stage in a CI/CD pipeline */
export interface PipelineStage {
  id: string;
  name: string; // 'build' | 'test' | 'package' | 'deploy'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  startedAt?: number;
  completedAt?: number;
}

/** GitHub configuration for deployment */
export interface GitHubConfig {
  token: string;
  repository: string;
  branch: string;
  authorName: string;
  authorEmail: string;
}

/** GitHub API response types */
interface GitHubRepoResponse {
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

interface GitHubCommitResponse {
  sha: string;
  html_url: string;
}

interface GitHubRefResponse {
  ref: string;
  object: {
    sha: string;
  };
}

// ─── Constants ─────────────────────────────────────────

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_BRANCH = 'main';

// ─── CICDEngine Class ──────────────────────────────────

/**
 * CI/CD + GitHub Deployment Engine.
 * Creates and executes pipelines with four stages:
 * 1. Build — Validate project structure and dependencies
 * 2. Test — Run the automated testing layer
 * 3. Package — Prepare the artifact for deployment
 * 4. Deploy — Push to GitHub via REST API
 *
 * GitHub deployment uses the REST API directly (no SDK)
 * with the following steps:
 * 1. Create repository if not exists
 * 2. Create branch
 * 3. Add files as commits
 * 4. Create version tag
 * 5. Return repository URL
 */
export class CICDEngine {
  private pipelines: Map<string, CICDPipeline> = new Map();
  private githubConfig: GitHubConfig | null = null;

  /**
   * Create a new CI/CD pipeline for a project.
   * Initializes the four standard stages: build, test, package, deploy.
   *
   * @param name - The pipeline name
   * @param projectStructure - Map of file paths to file contents
   * @returns The created pipeline
   */
  createPipeline(name: string, projectStructure: Record<string, string>): CICDPipeline {
    const id = `pipeline-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const stages: PipelineStage[] = [
      {
        id: `${id}-build`,
        name: 'build',
        status: 'pending',
      },
      {
        id: `${id}-test`,
        name: 'test',
        status: 'pending',
      },
      {
        id: `${id}-package`,
        name: 'package',
        status: 'pending',
      },
      {
        id: `${id}-deploy`,
        name: 'deploy',
        status: 'pending',
      },
    ];

    const pipeline: CICDPipeline = {
      id,
      name,
      stages,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.pipelines.set(id, pipeline);

    // Store project structure in the pipeline for later use
    (pipeline as CICDPipeline & { _projectStructure: Record<string, string> })._projectStructure = projectStructure;

    return { ...pipeline };
  }

  /**
   * Execute all stages of a pipeline sequentially.
   * Stops at the first failed stage.
   *
   * @param pipelineId - The ID of the pipeline to execute
   * @returns The updated pipeline after execution
   */
  async executePipeline(pipelineId: string): Promise<CICDPipeline> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const projectStructure = (pipeline as CICDPipeline & { _projectStructure?: Record<string, string> })._projectStructure ?? {};

    // Execute stages sequentially
    for (const stage of pipeline.stages) {
      try {
        let result: PipelineStage;

        switch (stage.name) {
          case 'build':
            pipeline.status = 'building';
            result = await this.build(projectStructure);
            break;
          case 'test':
            pipeline.status = 'testing';
            result = await this.test(Object.values(projectStructure).join('\n\n'));
            break;
          case 'package':
            pipeline.status = 'packaging';
            result = await this.package(pipelineId);
            break;
          case 'deploy':
            pipeline.status = 'deploying';
            if (this.githubConfig) {
              result = await this.deployToGitHub(pipelineId, this.githubConfig);
            } else {
              result = {
                ...stage,
                status: 'skipped',
                output: 'Deployment skipped — GitHub config not set',
                startedAt: Date.now(),
                completedAt: Date.now(),
              };
            }
            break;
          default:
            result = {
              ...stage,
              status: 'skipped',
              output: `Unknown stage: ${stage.name}`,
            };
        }

        // Update the stage in the pipeline
        const stageIndex = pipeline.stages.findIndex(s => s.name === stage.name);
        if (stageIndex >= 0) {
          pipeline.stages[stageIndex] = result;
        }

        // If stage failed, stop pipeline
        if (result.status === 'failed') {
          pipeline.status = 'failed';
          pipeline.completedAt = Date.now();
          this.pipelines.set(pipelineId, { ...pipeline });
          return { ...pipeline };
        }
      } catch (error) {
        // Mark stage as failed
        const stageIndex = pipeline.stages.findIndex(s => s.name === stage.name);
        if (stageIndex >= 0) {
          pipeline.stages[stageIndex] = {
            ...pipeline.stages[stageIndex]!,
            status: 'failed',
            output: `Stage execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            startedAt: Date.now(),
            completedAt: Date.now(),
          };
        }
        pipeline.status = 'failed';
        pipeline.completedAt = Date.now();
        this.pipelines.set(pipelineId, { ...pipeline });
        return { ...pipeline };
      }
    }

    // All stages completed
    pipeline.status = 'completed';
    pipeline.completedAt = Date.now();

    // Generate version
    pipeline.version = this.generateVersion();

    this.pipelines.set(pipelineId, { ...pipeline });
    return { ...pipeline };
  }

  /**
   * Build stage: Validate project structure and dependencies.
   * Checks for required files, valid package.json, and dependency consistency.
   *
   * @param projectStructure - Map of file paths to file contents
   * @returns The build stage result
   */
  async build(projectStructure: Record<string, string>): Promise<PipelineStage> {
    const startedAt = Date.now();
    const issues: string[] = [];

    // Check for essential files
    const essentialFiles = ['package.json'];
    for (const file of essentialFiles) {
      const found = Object.keys(projectStructure).some(
        path => path.endsWith(file) || path === file
      );
      if (!found) {
        issues.push(`Missing essential file: ${file}`);
      }
    }

    // Validate package.json if present
    const packageJsonPath = Object.keys(projectStructure).find(
      path => path.endsWith('package.json') || path === 'package.json'
    );
    if (packageJsonPath) {
      try {
        const pkgJson = JSON.parse(projectStructure[packageJsonPath]!);
        if (!pkgJson.name) issues.push('package.json missing "name" field');
        if (!pkgJson.version) issues.push('package.json missing "version" field');
        if (pkgJson.dependencies) {
          for (const [dep, version] of Object.entries(pkgJson.dependencies)) {
            if (typeof version !== 'string' || version.trim() === '') {
              issues.push(`Invalid version for dependency "${dep}": ${version}`);
            }
          }
        }
      } catch {
        issues.push('package.json is not valid JSON');
      }
    }

    // Check for TypeScript configuration
    const hasTsConfig = Object.keys(projectStructure).some(
      path => path.includes('tsconfig')
    );
    if (!hasTsConfig) {
      issues.push('No tsconfig.json found (recommended for TypeScript projects)');
    }

    // Validate TypeScript files for syntax issues
    let totalCriticalIssues = 0;
    for (const [path, content] of Object.entries(projectStructure)) {
      if (path.endsWith('.ts') || path.endsWith('.tsx')) {
        const validation = zeroErrorEngine.validate(content, 'code');
        if (validation.score < 60) {
          issues.push(`${path}: validation score ${validation.score}/100`);
          totalCriticalIssues += validation.errors.filter(e => e.severity === 'critical').length;
        }
      }
    }

    // Check for import consistency
    const allImports: string[] = [];
    for (const content of Object.values(projectStructure)) {
      const importMatches = content.match(/from\s+['"](\.\/[^'"]+)['"]/g) || [];
      allImports.push(...importMatches);
    }

    // Verify relative imports reference existing files
    const filePaths = new Set(Object.keys(projectStructure));
    for (const imp of allImports) {
      const pathMatch = imp.match(/from\s+['"](\.\/[^'"]+)['"]/);
      if (pathMatch) {
        const importPath = pathMatch[1]!;
        const possiblePaths = [
          importPath,
          `${importPath}.ts`,
          `${importPath}.tsx`,
          `${importPath}.js`,
          `${importPath}/index.ts`,
          `${importPath}/index.tsx`,
        ];
        const exists = possiblePaths.some(p => filePaths.has(p));
        if (!exists) {
          issues.push(`Unresolved import: ${importPath}`);
        }
      }
    }

    const stage: PipelineStage = {
      id: `build-${Date.now()}`,
      name: 'build',
      status: totalCriticalIssues > 0 ? 'failed' : 'completed',
      output: issues.length > 0
        ? `Build completed with ${issues.length} issue(s):\n${issues.map(i => `  - ${i}`).join('\n')}`
        : 'Build completed successfully — all validations passed',
      startedAt,
      completedAt: Date.now(),
    };

    return stage;
  }

  /**
   * Test stage: Run the automated testing layer on all code files.
   *
   * @param code - Combined code from all project files
   * @returns The test stage result
   */
  async test(code: string): Promise<PipelineStage> {
    const startedAt = Date.now();

    try {
      // Generate and simulate tests
      const testSuite = testingLayer.createTestSuite(code, 'typescript');

      const passedCount = testSuite.results.filter(r => r.passed).length;
      const failedCount = testSuite.results.filter(r => !r.passed).length;
      const totalTests = testSuite.results.length;

      // Check edge cases
      const edgeCaseIssues = testingLayer.checkEdgeCases(code);

      const stage: PipelineStage = {
        id: `test-${Date.now()}`,
        name: 'test',
        status: testSuite.passed && edgeCaseIssues.filter(e => e.severity === 'critical').length === 0
          ? 'completed'
          : 'failed',
        output: [
          `Test Results: ${passedCount}/${totalTests} passed (${testSuite.coverage}% coverage)`,
          failedCount > 0 ? `  Failed: ${failedCount} tests` : '',
          edgeCaseIssues.length > 0
            ? `  Edge case warnings: ${edgeCaseIssues.length}`
            : '',
          testSuite.passed
            ? 'All tests passed ✓'
            : `Some tests failed — review and fix before deployment`,
        ].filter(Boolean).join('\n'),
        startedAt,
        completedAt: Date.now(),
      };

      return stage;
    } catch (error) {
      return {
        id: `test-${Date.now()}`,
        name: 'test',
        status: 'failed',
        output: `Test execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startedAt,
        completedAt: Date.now(),
      };
    }
  }

  /**
   * Package stage: Prepare the artifact for deployment.
   * Validates the complete project and generates metadata.
   *
   * @param pipelineId - The pipeline ID being packaged
   * @returns The package stage result
   */
  async package(pipelineId: string): Promise<PipelineStage> {
    const startedAt = Date.now();
    const pipeline = this.pipelines.get(pipelineId);

    if (!pipeline) {
      return {
        id: `package-${Date.now()}`,
        name: 'package',
        status: 'failed',
        output: 'Pipeline not found',
        startedAt,
        completedAt: Date.now(),
      };
    }

    // Check that previous stages passed
    const buildStage = pipeline.stages.find(s => s.name === 'build');
    const testStage = pipeline.stages.find(s => s.name === 'test');

    if (buildStage?.status !== 'completed') {
      return {
        id: `package-${Date.now()}`,
        name: 'package',
        status: 'failed',
        output: 'Cannot package — build stage did not complete',
        startedAt,
        completedAt: Date.now(),
      };
    }

    if (testStage?.status === 'failed') {
      return {
        id: `package-${Date.now()}`,
        name: 'package',
        status: 'failed',
        output: 'Cannot package — test stage failed',
        startedAt,
        completedAt: Date.now(),
      };
    }

    // Generate version number
    const version = this.generateVersion();
    pipeline.version = version;

    // Generate artifact metadata
    const projectStructure = (pipeline as CICDPipeline & { _projectStructure?: Record<string, string> })._projectStructure ?? {};
    const fileCount = Object.keys(projectStructure).length;
    const totalSize = Object.values(projectStructure).reduce((sum, content) => sum + content.length, 0);

    const stage: PipelineStage = {
      id: `package-${Date.now()}`,
      name: 'package',
      status: 'completed',
      output: [
        `Package prepared successfully`,
        `  Version: ${version}`,
        `  Files: ${fileCount}`,
        `  Total size: ${(totalSize / 1024).toFixed(1)} KB`,
        `  Build: ${buildStage.status}`,
        `  Tests: ${testStage?.status ?? 'skipped'}`,
      ].join('\n'),
      startedAt,
      completedAt: Date.now(),
    };

    this.pipelines.set(pipelineId, { ...pipeline });
    return stage;
  }

  /**
   * Deploy to GitHub using the REST API.
   * Steps:
   * 1. Create repository if not exists
   * 2. Create branch
   * 3. Add files as commits
   * 4. Create version tag
   * 5. Return repository URL
   *
   * @param pipelineId - The pipeline ID to deploy
   * @param config - GitHub configuration with token and repo info
   * @returns The deploy stage result
   */
  async deployToGitHub(pipelineId: string, config: GitHubConfig): Promise<PipelineStage> {
    const startedAt = Date.now();
    const pipeline = this.pipelines.get(pipelineId);

    if (!pipeline) {
      return {
        id: `deploy-${Date.now()}`,
        name: 'deploy',
        status: 'failed',
        output: 'Pipeline not found',
        startedAt,
        completedAt: Date.now(),
      };
    }

    const projectStructure = (pipeline as CICDPipeline & { _projectStructure?: Record<string, string> })._projectStructure ?? {};

    try {
      // Step 1: Ensure repository exists
      const repoResult = await this.ensureRepository(config);
      if (!repoResult) {
        return {
          id: `deploy-${Date.now()}`,
          name: 'deploy',
          status: 'failed',
          output: 'Failed to create or access repository',
          startedAt,
          completedAt: Date.now(),
        };
      }

      pipeline.repository = repoResult.html_url;

      // Step 2: Create branch
      const branchResult = await this.createBranch(config, config.branch || DEFAULT_BRANCH);
      if (!branchResult) {
        return {
          id: `deploy-${Date.now()}`,
          name: 'deploy',
          status: 'failed',
          output: `Failed to create branch: ${config.branch}`,
          startedAt,
          completedAt: Date.now(),
        };
      }

      // Step 3: Add files as commits
      const commitResults = await this.commitFiles(config, projectStructure);
      if (commitResults.length === 0) {
        return {
          id: `deploy-${Date.now()}`,
          name: 'deploy',
          status: 'failed',
          output: 'Failed to commit files to repository',
          startedAt,
          completedAt: Date.now(),
        };
      }

      // Step 4: Create version tag
      const version = pipeline.version ?? this.generateVersion();
      const tagResult = await this.createTag(config, version);
      const tagUrl = tagResult ? `Tag: ${version}` : 'Tag creation skipped';

      // Step 5: Return repository URL
      const stage: PipelineStage = {
        id: `deploy-${Date.now()}`,
        name: 'deploy',
        status: 'completed',
        output: [
          `Deployment successful!`,
          `  Repository: ${repoResult.html_url}`,
          `  Branch: ${config.branch || DEFAULT_BRANCH}`,
          `  Commits: ${commitResults.length} file(s) pushed`,
          `  ${tagUrl}`,
          `  Version: ${version}`,
        ].join('\n'),
        startedAt,
        completedAt: Date.now(),
      };

      pipeline.artifactUrl = repoResult.html_url;
      this.pipelines.set(pipelineId, { ...pipeline });

      return stage;
    } catch (error) {
      return {
        id: `deploy-${Date.now()}`,
        name: 'deploy',
        status: 'failed',
        output: `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startedAt,
        completedAt: Date.now(),
      };
    }
  }

  // ─── GitHub API Methods ─────────────────────────────

  /**
   * Ensure a GitHub repository exists. Creates it if it doesn't.
   */
  private async ensureRepository(config: GitHubConfig): Promise<GitHubRepoResponse | null> {
    const [owner, repo] = config.repository.split('/');

    // Try to get existing repository
    try {
      const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
        headers: this.getGitHubHeaders(config.token),
      });

      if (response.ok) {
        return await response.json() as GitHubRepoResponse;
      }
    } catch {
      // Repository doesn't exist or network error
    }

    // Create the repository
    try {
      const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
        method: 'POST',
        headers: this.getGitHubHeaders(config.token),
        body: JSON.stringify({
          name: repo,
          description: `Deployed by Agentic OS CI/CD Engine`,
          private: false,
          auto_init: true,
        }),
      });

      if (response.ok || response.status === 201) {
        return await response.json() as GitHubRepoResponse;
      }

      // If user/repos fails, try org/repos for organizations
      const errorBody = await response.text();
      console.error(`Failed to create repo: ${response.status} ${errorBody}`);
      return null;
    } catch (error) {
      console.error(`GitHub API error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  /**
   * Create a branch in the repository
   */
  private async createBranch(config: GitHubConfig, branch: string): Promise<boolean> {
    const [owner, repo] = config.repository.split('/');
    const branchName = branch.startsWith('refs/heads/') ? branch : `refs/heads/${branch}`;

    // Get the SHA of the default branch
    try {
      const refResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${DEFAULT_BRANCH}`,
        { headers: this.getGitHubHeaders(config.token) }
      );

      if (!refResponse.ok) {
        // Try main branch
        const mainRefResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/main`,
          { headers: this.getGitHubHeaders(config.token) }
        );

        if (!mainRefResponse.ok) {
          return false;
        }

        const mainRef = await mainRefResponse.json() as GitHubRefResponse;
        return await this.createRef(config, branchName, mainRef.object.sha);
      }

      const ref = await refResponse.json() as GitHubRefResponse;
      return await this.createRef(config, branchName, ref.object.sha);
    } catch {
      return false;
    }
  }

  /**
   * Create a git reference (branch)
   */
  private async createRef(config: GitHubConfig, ref: string, sha: string): Promise<boolean> {
    const [owner, repo] = config.repository.split('/');

    try {
      const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: this.getGitHubHeaders(config.token),
        body: JSON.stringify({ ref, sha }),
      });

      return response.ok || response.status === 201;
    } catch {
      return false;
    }
  }

  /**
   * Commit files to the repository using the Git Data API
   */
  private async commitFiles(
    config: GitHubConfig,
    files: Record<string, string>,
  ): Promise<GitHubCommitResponse[]> {
    const [owner, repo] = config.repository.split('/');
    const branch = config.branch || DEFAULT_BRANCH;
    const commits: GitHubCommitResponse[] = [];

    // Batch files into commits (max 100 files per commit)
    const fileEntries = Object.entries(files);
    const batchSize = 50;

    for (let i = 0; i < fileEntries.length; i += batchSize) {
      const batch = fileEntries.slice(i, i + batchSize);

      try {
        // Get the latest commit on the branch
        const refResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
          { headers: this.getGitHubHeaders(config.token) }
        );

        if (!refResponse.ok) {
          // Branch might not exist yet, try creating it from default
          continue;
        }

        const ref = await refResponse.json() as GitHubRefResponse;
        const latestCommitSha = ref.object.sha;

        // Get the tree of the latest commit
        const commitResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
          { headers: this.getGitHubHeaders(config.token) }
        );

        if (!commitResponse.ok) continue;

        const commitData = await commitResponse.json() as { tree: { sha: string } };
        const baseTreeSha = commitData.tree.sha;

        // Create blobs for each file
        const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
        for (const [path, content] of batch) {
          const blobResponse = await fetch(
            `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`,
            {
              method: 'POST',
              headers: this.getGitHubHeaders(config.token),
              body: JSON.stringify({
                content: Buffer.from(content).toString('base64'),
                encoding: 'base64',
              }),
            }
          );

          if (blobResponse.ok) {
            const blobData = await blobResponse.json() as { sha: string };
            treeItems.push({
              path: path.startsWith('/') ? path.substring(1) : path,
              mode: '100644',
              type: 'blob',
              sha: blobData.sha,
            });
          }
        }

        if (treeItems.length === 0) continue;

        // Create a new tree
        const treeResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`,
          {
            method: 'POST',
            headers: this.getGitHubHeaders(config.token),
            body: JSON.stringify({
              base_tree: baseTreeSha,
              tree: treeItems,
            }),
          }
        );

        if (!treeResponse.ok) continue;

        const treeData = await treeResponse.json() as { sha: string };

        // Create a commit
        const newCommitResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`,
          {
            method: 'POST',
            headers: this.getGitHubHeaders(config.token),
            body: JSON.stringify({
              message: `Deploy via Agentic OS CI/CD — batch ${Math.floor(i / batchSize) + 1}`,
              tree: treeData.sha,
              parents: [latestCommitSha],
              author: {
                name: config.authorName,
                email: config.authorEmail,
                date: new Date().toISOString(),
              },
            }),
          }
        );

        if (!newCommitResponse.ok) continue;

        const newCommit = await newCommitResponse.json() as GitHubCommitResponse;

        // Update the branch reference
        await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
          {
            method: 'PATCH',
            headers: this.getGitHubHeaders(config.token),
            body: JSON.stringify({ sha: newCommit.sha }),
          }
        );

        commits.push(newCommit);
      } catch {
        // Continue with next batch
        continue;
      }
    }

    return commits;
  }

  /**
   * Create a version tag in the repository
   */
  private async createTag(config: GitHubConfig, version: string): Promise<boolean> {
    const [owner, repo] = config.repository.split('/');
    const branch = config.branch || DEFAULT_BRANCH;

    try {
      // Get the latest commit SHA on the branch
      const refResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers: this.getGitHubHeaders(config.token) }
      );

      if (!refResponse.ok) return false;

      const ref = await refResponse.json() as GitHubRefResponse;

      // Create an annotated tag
      const tagResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/tags`,
        {
          method: 'POST',
          headers: this.getGitHubHeaders(config.token),
          body: JSON.stringify({
            tag: version,
            message: `Release ${version}`,
            object: ref.object.sha,
            type: 'commit',
            tagger: {
              name: config.authorName,
              email: config.authorEmail,
              date: new Date().toISOString(),
            },
          }),
        }
      );

      if (!tagResponse.ok) return false;

      const tagData = await tagResponse.json() as { sha: string };

      // Create the tag reference
      const tagRefResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`,
        {
          method: 'POST',
          headers: this.getGitHubHeaders(config.token),
          body: JSON.stringify({
            ref: `refs/tags/${version}`,
            sha: tagData.sha,
          }),
        }
      );

      return tagRefResponse.ok || tagRefResponse.status === 201;
    } catch {
      return false;
    }
  }

  // ─── Query Methods ──────────────────────────────────

  /**
   * Get a pipeline by ID
   */
  getPipeline(id: string): CICDPipeline | undefined {
    const pipeline = this.pipelines.get(id);
    return pipeline ? { ...pipeline } : undefined;
  }

  /**
   * List all pipelines
   */
  listPipelines(): CICDPipeline[] {
    return Array.from(this.pipelines.values()).map(p => ({ ...p }));
  }

  /**
   * Set GitHub configuration for deployments
   */
  setGitHubConfig(config: GitHubConfig): void {
    this.githubConfig = { ...config };
  }

  /**
   * Get current GitHub config (token masked)
   */
  getGitHubConfig(): Omit<GitHubConfig, 'token'> & { token: string } | null {
    if (!this.githubConfig) return null;
    return {
      ...this.githubConfig,
      token: '••••••••', // Mask token
    };
  }

  /**
   * Delete a pipeline
   */
  deletePipeline(id: string): boolean {
    return this.pipelines.delete(id);
  }

  /**
   * Clear all pipelines
   */
  clearPipelines(): void {
    this.pipelines.clear();
  }

  // ─── Helper Methods ─────────────────────────────────

  /**
   * Generate GitHub API request headers
   */
  private getGitHubHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Agentic-OS-CICD/1.0',
    };
  }

  /**
   * Generate a semantic version number
   */
  private generateVersion(): string {
    const now = new Date();
    const major = 1;
    const minor = now.getMonth() + 1;
    const patch = now.getDate();
    const build = Math.floor(Date.now() / 1000) % 100000;
    return `v${major}.${minor}.${patch}-build.${build}`;
  }
}

// ─── Singleton Instance ────────────────────────────────

/** Global CI/CD engine instance — manages build, test, package, and deploy pipelines */
export const cicdEngine = new CICDEngine();
