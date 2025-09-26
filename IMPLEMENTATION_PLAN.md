# 🚀 WorldHuman Studio App - Core Features Implementation Plan

## 📊 Current Status
- **Authentication**: ✅ Complete (World ID + Session Management)
- **Database**: ✅ Ready (All tables created, indexed)
- **UI Framework**: ✅ Set up (World App UI Kit)
- **Deployment**: ✅ Fixed and working
- **Core Functionality**: 🔴 35% Complete

## 🎯 Priority Features to Build

### Phase 1: Make Tasks Functional (Priority: CRITICAL)
**Timeline: 2-3 days**

#### 1.1 Connect Tasks Page to Real Data
```typescript
// Replace mock data in /tasks/page-uikit.tsx
- Connect to GET /api/tasks endpoint
- Implement real-time task fetching
- Add loading states
- Handle empty states
```

**Files to modify:**
- `/src/app/tasks/page-uikit.tsx` - Replace mock data with API calls
- `/src/hooks/useTasks.ts` - Create custom hook for task fetching
- `/src/stores/index.ts` - Add tasks slice for state management

#### 1.2 Task Details Page
```typescript
// Create /tasks/[id]/page.tsx
- Show full task details
- Display instructions and requirements
- Show reward amount and estimated time
- Add "Start Task" button
```

**New files needed:**
- `/src/app/tasks/[id]/page.tsx`
- `/src/components/tasks/TaskDetails.tsx`

### Phase 2: Enable Task Submission (Priority: HIGH)
**Timeline: 2-3 days**

#### 2.1 Task Submission Interfaces
Based on task type, show appropriate interface:

**RLHF Rating Interface** (`/src/components/task-interfaces/RLHFRatingInterface.tsx`)
```typescript
- Display AI responses side-by-side
- Rating system (1-5 stars)
- Submit rating with explanation
```

**Voice Recording Interface** (`/src/components/task-interfaces/VoiceRecordingInterface.tsx`)
```typescript
- Audio recording with Web Audio API
- Playback controls
- Upload to Vercel Blob storage
- Submit recording URL
```

**Data Annotation Interface** (`/src/components/task-interfaces/DataAnnotationInterface.tsx`)
```typescript
- Image display with annotation tools
- Bounding box creation
- Label assignment
- Submit annotations as JSON
```

#### 2.2 Submission Flow
```typescript
// POST /api/tasks/[id]/submit
- Validate submission data
- Check user hasn't already submitted
- Store submission with pending status
- Return success/error
```

**Files to create:**
- `/src/app/tasks/[id]/submit/page.tsx`
- `/src/components/submissions/SubmissionForm.tsx`
- All task interface components listed above

### Phase 3: Submissions Management (Priority: HIGH)
**Timeline: 1-2 days**

#### 3.1 Submissions Page
```typescript
// Connect /submissions/page-uikit.tsx to real data
- Fetch user's submissions from API
- Show status (pending/approved/rejected)
- Display earnings for approved submissions
```

**Files to modify:**
- `/src/app/submissions/page-uikit.tsx`
- Create `/src/hooks/useSubmissions.ts`

#### 3.2 Submission Review (Admin)
```typescript
// Create admin review interface
- List pending submissions
- Review submitted work
- Approve/reject with notes
- Trigger payment on approval
```

**New files needed:**
- `/src/app/admin/submissions/page.tsx`
- `/src/components/admin/SubmissionReview.tsx`

### Phase 4: Payment Integration (Priority: MEDIUM)
**Timeline: 2-3 days**

#### 4.1 Payment Processing
```typescript
// Integrate MiniKit payment
- Use MiniKit.commandsAsync.pay()
- Support WLD, ETH, USDC
- Handle payment confirmation
```

**Files to create:**
- `/src/components/payments/PaymentProcessor.tsx`
- `/src/hooks/usePayments.ts`

#### 4.2 Payment History
```typescript
// Create payment history page
- Show all transactions
- Filter by status
- Export to CSV
```

**New files:**
- `/src/app/payments/page.tsx`
- `/src/components/payments/PaymentHistory.tsx`

### Phase 5: User Profile (Priority: LOW)
**Timeline: 1-2 days**

#### 5.1 Profile Page
```typescript
// Create user profile page
- Display user info
- Edit username/bio
- Show reputation score
- Statistics and achievements
```

**New files:**
- `/src/app/profile/page.tsx`
- `/src/components/profile/ProfileEditor.tsx`

### Phase 6: Task Creation (Priority: LOW)
**Timeline: 2 days**

#### 6.1 Task Creation Form
```typescript
// Allow users to create tasks
- Multi-step form
- Task type selection
- Instructions editor
- Reward amount setting
- Preview before submission
```

**New files:**
- `/src/app/tasks/create/page.tsx`
- `/src/components/tasks/TaskCreator.tsx`

## 📁 File Structure After Implementation

```
src/
├── app/
│   ├── page.tsx (✅ Landing/Auth)
│   ├── dashboard/
│   │   └── page.tsx (✅ Dashboard)
│   ├── tasks/
│   │   ├── page.tsx (🔄 Task listing)
│   │   ├── [id]/
│   │   │   ├── page.tsx (📝 Task details)
│   │   │   └── submit/
│   │   │       └── page.tsx (📝 Submission form)
│   │   └── create/
│   │       └── page.tsx (📝 Create task)
│   ├── submissions/
│   │   └── page.tsx (🔄 User submissions)
│   ├── payments/
│   │   └── page.tsx (📝 Payment history)
│   ├── profile/
│   │   └── page.tsx (📝 User profile)
│   └── admin/
│       └── submissions/
│           └── page.tsx (📝 Review submissions)
├── components/
│   ├── auth/ (✅ Complete)
│   ├── tasks/
│   │   ├── TaskCard.tsx (📝)
│   │   ├── TaskDetails.tsx (📝)
│   │   └── TaskCreator.tsx (📝)
│   ├── task-interfaces/
│   │   ├── RLHFRatingInterface.tsx (📝)
│   │   ├── VoiceRecordingInterface.tsx (📝)
│   │   └── DataAnnotationInterface.tsx (📝)
│   ├── submissions/
│   │   ├── SubmissionForm.tsx (📝)
│   │   └── SubmissionHistory.tsx (📝)
│   ├── payments/
│   │   ├── PaymentProcessor.tsx (📝)
│   │   └── PaymentHistory.tsx (📝)
│   └── profile/
│       └── ProfileEditor.tsx (📝)
├── hooks/
│   ├── useTasks.ts (📝)
│   ├── useSubmissions.ts (📝)
│   └── usePayments.ts (📝)
└── stores/
    └── index.ts (🔄 Add slices)
```

## 🔧 Technical Implementation Details

### State Management (Zustand)
```typescript
// Add to stores/index.ts
interface TasksSlice {
  tasks: Task[]
  filters: TaskFilters
  isLoading: boolean
  fetchTasks: () => Promise<void>
  setFilter: (filter: Partial<TaskFilters>) => void
}

interface SubmissionsSlice {
  submissions: Submission[]
  fetchSubmissions: () => Promise<void>
  submitTask: (taskId: string, data: any) => Promise<void>
}
```

### API Integration Pattern
```typescript
// Example hook pattern
export const useTasks = () => {
  const { tasks, isLoading, fetchTasks } = useTaskStore()

  useEffect(() => {
    fetchTasks()
  }, [])

  return { tasks, isLoading }
}
```

### Task Type Interfaces
```typescript
interface TaskType {
  RLHF_RATING = 'rlhf_rating',
  VOICE_RECORDING = 'voice_recording',
  DATA_ANNOTATION = 'data_annotation',
  CONTENT_REVIEW = 'content_review',
  TRANSLATION = 'translation'
}
```

## 🚀 Quick Start Commands

```bash
# Phase 1: Connect Tasks to Real Data
npm run dev
# Work on /src/app/tasks/page-uikit.tsx

# Phase 2: Build Submission Interfaces
# Create task interface components

# Phase 3: Test Full Flow
# 1. Browse tasks
# 2. Select a task
# 3. Complete submission
# 4. Check submission status

# Deploy after each phase
git add .
git commit -m "feat: Implement [phase name]"
git push
```

## ✅ Success Criteria

### MVP Complete When:
1. ✅ Users can authenticate with World ID
2. 🔴 Users can browse real tasks from database
3. 🔴 Users can submit work for tasks
4. 🔴 Submissions are stored and reviewable
5. 🔴 Basic payment flow works
6. ✅ All UI follows World App guidelines

### Full Product When:
- Task creation by users
- Automated payment processing
- Reputation system active
- Review and dispute system
- Analytics dashboard
- Admin panel

## 📈 Progress Tracking

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Real Tasks | 🔴 Not Started | 0% |
| Phase 2: Submissions | 🔴 Not Started | 0% |
| Phase 3: Management | 🔴 Not Started | 0% |
| Phase 4: Payments | 🔴 Not Started | 0% |
| Phase 5: Profile | 🔴 Not Started | 0% |
| Phase 6: Creation | 🔴 Not Started | 0% |

## 🎯 Next Immediate Steps

1. **TODAY**: Fix tasks page to use real API data
2. **TOMORROW**: Build first task submission interface (RLHF Rating)
3. **DAY 3**: Complete submission flow end-to-end
4. **DAY 4**: Add payment processing
5. **DAY 5**: Polish and deploy MVP

---

**Note**: This plan follows the architecture defined in `FRONTEND_COMPONENTS.md` and uses the existing database schema. All components should use World App UI Kit for consistency.