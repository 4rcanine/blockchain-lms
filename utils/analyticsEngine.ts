// utils/analyticsEngine.ts

export const calculateStudentStatus = (progress: number, avgGrade: number, lastLoginMs: number) => {
    // Safely handle lastActive. If 0 (never logged in), assume active now to avoid false flags.
    const lastActive = lastLoginMs > 0 ? lastLoginMs : Date.now();
    const daysSinceLastActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
    
    // 1. Rule-Based Risk Assessment
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let flagReason = "";

    if (daysSinceLastActive > 7 && avgGrade < 60) {
        riskLevel = 'high';
        flagReason = "Inactive for >7 days with failing grades.";
    } 
    // FIX: Changed 'daysActive' to 'daysSinceLastActive'
    else if (avgGrade < 70 || daysSinceLastActive > 5) {
        riskLevel = 'medium';
        flagReason = "Low performance or dropping engagement.";
    }

    // 2. Predictive "Success Probability" (Weighted Algorithm)
    // 60% weight on grades, 40% on completion progress
    const successProbability = Math.round((avgGrade * 0.6) + (progress * 0.4));

    return { riskLevel, successProbability, flagReason };
};