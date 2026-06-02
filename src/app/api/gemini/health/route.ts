import { NextResponse } from 'next/server';

export async function GET() {
  // Check if Gemini CLI is available
  try {
    // In a real implementation, this would check:
    // 1. If gemini CLI binary exists on the system
    // 2. If it's running and responsive
    // 3. Get version info
    // For now, return a structured response
    return NextResponse.json({
      installed: false,
      running: false,
      version: null,
      path: null,
      model: 'gemini-2.5-pro',
      message: 'Gemini CLI not detected. Install with: npm install -g @google/gemini-cli',
      installCommand: 'npm install -g @google/gemini-cli',
      docsUrl: 'https://github.com/google-gemini/gemini-cli',
    });
  } catch (error) {
    return NextResponse.json({
      installed: false,
      running: false,
      error: 'Health check failed',
    }, { status: 500 });
  }
}
