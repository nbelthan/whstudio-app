# WorldHuman Studio: Database Migration Plan for RLHF Scale

## 🚨 Critical Issues with Current Schema

### **Immediate Problems:**
1. **`tasks.instructions` is TEXT, not JSONB** - prevents efficient querying
2. **No structured response storage** - all user responses in single JSON blob
3. **No consensus mechanism** - can't calculate agreement across responses
4. **Single response per user** - prevents multiple submissions for consensus
5. **No question reusability** - every task recreates similar questions
6. **No user reputation tracking** - critical for RLHF quality

## 📊 Current Data Analysis

**✅ Successfully Loaded:** 60 MT-Bench A/B preference tasks
**❌ Submissions:** 0 (no users have submitted responses yet)
**⚠️ Storage Format:** All question data in TEXT field as JSON string

**Current MT-Bench Task Structure:**
```json
{
  "type": "pairwise_ab",
  "prompt": "Describe how photosynthesis works in simple terms.",
  "optionA": "Photosynthesis is the process by which plants...",
  "optionB": "Plants eat sunlight directly using their roots...",
  "gold": "A"
}
```

## 🎯 Recommended Architecture

### **Phase 1: Immediate Improvements (Week 1)**
1. **Convert `instructions` to JSONB**
2. **Add question versioning support**
3. **Enable multiple submissions per user**
4. **Add consensus threshold tracking**

### **Phase 2: Structured Storage (Week 2-3)**
1. **Create dedicated `questions` table**
2. **Migrate existing MT-Bench data**
3. **Implement consensus calculation functions**
4. **Add response quality metrics**

### **Phase 3: Advanced Features (Month 1)**
1. **User reputation system**
2. **Real-time consensus monitoring**
3. **Performance optimization**
4. **Analytics dashboard views**

## 🛠️ Implementation Steps

### **Step 1: Run Schema Migration**
```bash
cd whstudio-app
psql "$DATABASE_URL" -f schema-improvements.sql
```

### **Step 2: Update TypeScript Types**
```typescript
// src/types/tasks.ts
interface Question {
  id: string;
  question_type: 'pairwise_ab' | 'text_generation' | 'voice_transcription';
  content: {
    prompt: string;
    optionA?: string;
    optionB?: string;
    gold_standard?: string;
  };
  source_dataset: string;
}

interface TaskResponse {
  chosen_response: 'A' | 'B';
  confidence: number;
  explanation?: string;
  time_spent_seconds: number;
}

interface ConsensusResult {
  consensus_reached: boolean;
  agreement_percentage: number;
  final_answer: {
    chosen_response: 'A' | 'B';
  };
  total_responses: number;
}
```

### **Step 3: Update API Endpoints**
- **`/api/tasks`** - Use new task_dashboard view
- **`/api/tasks/[id]/submit`** - Handle structured responses
- **`/api/consensus/[taskId]`** - Real-time consensus status
- **`/api/users/reputation`** - User quality metrics

### **Step 4: Frontend Components**
- **Task Card Component** - Show consensus progress
- **Response Form** - Structured A/B selection with confidence
- **User Dashboard** - Reputation and quality scores
- **Admin Analytics** - Consensus monitoring

## 📈 Scalability Benefits

### **Query Performance:**
- **Before:** Full table scan on TEXT instructions
- **After:** Indexed JSONB queries + dedicated question table

### **Consensus Calculation:**
- **Before:** Manual parsing of all JSON responses
- **After:** Real-time calculation with database functions

### **User Experience:**
- **Before:** Single response, no feedback on quality
- **After:** Multiple attempts, reputation system, consensus participation

### **Data Analytics:**
- **Before:** Complex JSON parsing for insights
- **After:** Structured views and pre-computed metrics

## 🔧 Testing Strategy

### **Unit Tests:**
- Consensus calculation functions
- Question migration scripts
- Response quality scoring

### **Integration Tests:**
- API endpoints with new schema
- Frontend components with structured data
- Real-time consensus updates

### **Performance Tests:**
- Query performance on JSONB vs TEXT
- Consensus calculation with 1000+ responses
- Concurrent user submission handling

## 🚀 Deployment Plan

### **Zero-Downtime Migration:**
1. **Add new columns** (backward compatible)
2. **Migrate data** in background
3. **Update application code** to use new structure
4. **Remove old columns** once verified

### **Rollback Strategy:**
- Keep old `instructions` TEXT field during migration
- Implement feature flags for new vs old data access
- Monitor error rates and performance metrics

## 📊 Success Metrics

### **Technical Metrics:**
- Query response time < 100ms for task dashboard
- Consensus calculation < 1s for 100 responses
- Zero data loss during migration

### **User Experience Metrics:**
- Consensus agreement rate > 70%
- User engagement with reputation system
- Task completion time improvements

### **Business Metrics:**
- Increased task completion rates
- Higher quality response accuracy
- Reduced dispute resolution time

## 🎯 Next Actions

1. **Review schema-improvements.sql**
2. **Test migration on development database**
3. **Update TypeScript interfaces**
4. **Implement new API endpoints**
5. **Create frontend components for structured data**
6. **Deploy with feature flags**

This migration transforms the database from a basic task storage system into a sophisticated RLHF platform capable of handling millions of responses with real-time consensus tracking and user reputation management.