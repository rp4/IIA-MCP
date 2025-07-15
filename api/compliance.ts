import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ComplianceResult {
  scenario: string;
  relevantStandards: string[];
  complianceAssessment: {
    standard: string;
    title: string;
    assessment: string;
    complianceLevel: 'compliant' | 'partial' | 'non-compliant' | 'insufficient-info';
    recommendations: string[];
  }[];
  overallAssessment: string;
  keyRecommendations: string[];
}

async function validateCompliance(
  scenario: string, 
  standardsToCheck?: string[]
): Promise<ComplianceResult> {
  let relevantStandards = standardsToCheck || [];
  
  if (relevantStandards.length === 0) {
    // Auto-detect relevant standards based on scenario keywords
    relevantStandards = detectRelevantStandards(scenario);
  }
  
  const complianceAssessment = [];
  const keyRecommendations: string[] = [];
  
  for (const standardNumber of relevantStandards) {
    const assessment = await assessAgainstStandard(scenario, standardNumber);
    if (assessment) {
      complianceAssessment.push(assessment);
      keyRecommendations.push(...assessment.recommendations);
    }
  }
  
  const overallAssessment = generateOverallAssessment(complianceAssessment);
  
  return {
    scenario,
    relevantStandards,
    complianceAssessment,
    overallAssessment,
    keyRecommendations: [...new Set(keyRecommendations)].slice(0, 5) // Dedupe and limit
  };
}

function detectRelevantStandards(scenario: string): string[] {
  const keywords = scenario.toLowerCase();
  const relevantStandards: string[] = [];
  
  // Independence and objectivity
  if (keywords.includes('independence') || keywords.includes('objective') || keywords.includes('conflict')) {
    relevantStandards.push('1100', '1110', '1120', '1130');
  }
  
  // Planning
  if (keywords.includes('plan') || keywords.includes('planning') || keywords.includes('strategy')) {
    relevantStandards.push('2010', '2020', '2030');
  }
  
  // Risk management
  if (keywords.includes('risk') || keywords.includes('assessment')) {
    relevantStandards.push('2010', '2120', '2200');
  }
  
  // Governance
  if (keywords.includes('governance') || keywords.includes('board') || keywords.includes('oversight')) {
    relevantStandards.push('2110', '2060');
  }
  
  // Control
  if (keywords.includes('control') || keywords.includes('testing') || keywords.includes('evaluation')) {
    relevantStandards.push('2130', '2300', '2320');
  }
  
  // Engagement planning
  if (keywords.includes('engagement') || keywords.includes('audit plan') || keywords.includes('scope')) {
    relevantStandards.push('2200', '2210', '2220', '2230');
  }
  
  // Communication and reporting
  if (keywords.includes('report') || keywords.includes('communication') || keywords.includes('finding')) {
    relevantStandards.push('2400', '2410', '2420', '2440');
  }
  
  // Performance and quality
  if (keywords.includes('quality') || keywords.includes('performance') || keywords.includes('supervision')) {
    relevantStandards.push('2340', '2500');
  }
  
  return [...new Set(relevantStandards)]; // Remove duplicates
}

async function assessAgainstStandard(scenario: string, standardNumber: string) {
  try {
    const standardDetails = await getStandardContent(standardNumber);
    if (!standardDetails) {
      return null;
    }
    
    const assessment = analyzeCompliance(scenario, standardDetails);
    
    return {
      standard: standardNumber,
      title: standardDetails.title,
      assessment: assessment.description,
      complianceLevel: assessment.level,
      recommendations: assessment.recommendations
    };
  } catch (error) {
    console.error(`Error assessing standard ${standardNumber}:`, error);
    return null;
  }
}

async function getStandardContent(standardNumber: string) {
  const REPO_PATH = './iia-resources';
  const series = standardNumber.startsWith('1') ? '1000-series' : '2000-series';
  const standardsPath = path.join(REPO_PATH, 'standards', series);
  
  try {
    const files = await fs.readdir(standardsPath);
    const matchingFile = files.find(file => 
      file.includes(standardNumber) && file.endsWith('.md')
    );
    
    if (!matchingFile) {
      return null;
    }
    
    const filePath = path.join(standardsPath, matchingFile);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Parse title from metadata or content
    const titleMatch = content.match(/title:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : `Standard ${standardNumber}`;
    
    return { title, content };
  } catch (error) {
    console.error(`Error getting standard content for ${standardNumber}:`, error);
    return null;
  }
}

function analyzeCompliance(scenario: string, standardDetails: { title: string; content: string }) {
  const scenarioLower = scenario.toLowerCase();
  const contentLower = standardDetails.content.toLowerCase();
  
  // Simple compliance analysis based on keyword matching and pattern recognition
  const requirements = extractRequirements(standardDetails.content);
  const recommendations: string[] = [];
  let complianceScore = 0;
  let totalRequirements = requirements.length;
  
  for (const requirement of requirements) {
    const matches = checkRequirementCompliance(scenarioLower, requirement.toLowerCase());
    if (matches.isCompliant) {
      complianceScore++;
    } else {
      recommendations.push(matches.recommendation);
    }
  }
  
  // Determine compliance level
  let level: 'compliant' | 'partial' | 'non-compliant' | 'insufficient-info';
  const complianceRatio = totalRequirements > 0 ? complianceScore / totalRequirements : 0;
  
  if (complianceRatio >= 0.8) {
    level = 'compliant';
  } else if (complianceRatio >= 0.5) {
    level = 'partial';
  } else if (complianceRatio > 0) {
    level = 'non-compliant';
  } else {
    level = 'insufficient-info';
  }
  
  const description = generateComplianceDescription(level, complianceScore, totalRequirements);
  
  return {
    level,
    description,
    recommendations: recommendations.slice(0, 3) // Limit recommendations
  };
}

function extractRequirements(content: string): string[] {
  const requirements: string[] = [];
  
  // Look for "must" statements
  const mustMatches = content.match(/[^.]*must[^.]*\./gi);
  if (mustMatches) {
    requirements.push(...mustMatches);
  }
  
  // Look for "should" statements
  const shouldMatches = content.match(/[^.]*should[^.]*\./gi);
  if (shouldMatches) {
    requirements.push(...shouldMatches.slice(0, 2)); // Limit should statements
  }
  
  return requirements.map(req => req.trim()).filter(req => req.length > 20);
}

function checkRequirementCompliance(scenario: string, requirement: string) {
  // Simple keyword-based compliance checking
  const requirementKeywords = extractKeywords(requirement);
  const scenarioKeywords = extractKeywords(scenario);
  
  const matchingKeywords = requirementKeywords.filter(keyword => 
    scenarioKeywords.some(scenarioKeyword => 
      scenarioKeyword.includes(keyword) || keyword.includes(scenarioKeyword)
    )
  );
  
  const matchRatio = matchingKeywords.length / Math.max(requirementKeywords.length, 1);
  
  if (matchRatio >= 0.3) {
    return {
      isCompliant: true,
      recommendation: ''
    };
  } else {
    return {
      isCompliant: false,
      recommendation: generateRecommendation(requirement)
    };
  }
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !isStopWord(word));
    
  return [...new Set(words)];
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'must', 'should', 'will', 'that', 'this', 'with', 'from', 'they', 'have', 
    'been', 'their', 'would', 'there', 'could', 'other', 'such', 'when', 
    'where', 'what', 'which', 'than', 'more', 'also', 'some', 'time'
  ]);
  return stopWords.has(word);
}

function generateRecommendation(requirement: string): string {
  // Extract key action words and generate recommendations
  if (requirement.includes('must establish')) {
    return 'Establish required processes, policies, or procedures as specified';
  } else if (requirement.includes('must report')) {
    return 'Implement proper reporting mechanisms and communication channels';
  } else if (requirement.includes('must assess') || requirement.includes('must evaluate')) {
    return 'Conduct thorough assessment and evaluation processes';
  } else if (requirement.includes('independence') || requirement.includes('objective')) {
    return 'Review and strengthen independence and objectivity safeguards';
  } else {
    return 'Review compliance with this requirement and implement necessary controls';
  }
}

function generateComplianceDescription(
  level: string, 
  score: number, 
  total: number
): string {
  switch (level) {
    case 'compliant':
      return `Scenario appears to align well with standard requirements (${score}/${total} requirements addressed)`;
    case 'partial':
      return `Scenario partially complies with standard requirements (${score}/${total} requirements addressed). Some gaps identified`;
    case 'non-compliant':
      return `Scenario has significant gaps in compliance with standard requirements (${score}/${total} requirements addressed)`;
    case 'insufficient-info':
      return 'Insufficient information in scenario to assess compliance with this standard';
    default:
      return 'Unable to assess compliance';
  }
}

function generateOverallAssessment(assessments: any[]): string {
  if (assessments.length === 0) {
    return 'No relevant standards identified for assessment';
  }
  
  const compliantCount = assessments.filter(a => a.complianceLevel === 'compliant').length;
  const partialCount = assessments.filter(a => a.complianceLevel === 'partial').length;
  const nonCompliantCount = assessments.filter(a => a.complianceLevel === 'non-compliant').length;
  
  if (compliantCount === assessments.length) {
    return 'Scenario demonstrates good compliance with relevant IIA standards';
  } else if (compliantCount > assessments.length / 2) {
    return 'Scenario shows mostly compliant practices with some areas for improvement';
  } else if (partialCount > nonCompliantCount) {
    return 'Scenario shows partial compliance with standards - several improvements needed';
  } else {
    return 'Scenario indicates significant compliance gaps requiring attention';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { scenario, standards } = req.body;
      
      if (!scenario || typeof scenario !== 'string') {
        return res.status(400).json({ error: 'Scenario is required' });
      }
      
      const result = await validateCompliance(scenario, standards);
      return res.json(result);
    } catch (error) {
      console.error('Error validating compliance:', error);
      return res.status(500).json({ error: 'Compliance validation failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}