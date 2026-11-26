import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from './components/Layout'
import { UpdatePrompt } from './components/UpdatePrompt'
import { AboutPage } from './features/about/AboutPage'
import { LessonPage } from './features/lesson/LessonPage'
import { PathPage } from './features/path/PathPage'
import { PracticePage } from './features/practice/PracticePage'
import { PracticeSession } from './features/practice/PracticeSession'
import { ProfilePage } from './features/profile/ProfilePage'
import { requestPersistentStorage } from './store/progress'

export default function App() {
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<PathPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
        <Route path="lesson/:lessonId" element={<LessonPage />} />
        <Route path="practice/session" element={<PracticeSession />} />
        <Route path="*" element={<PathPage />} />
      </Routes>
      <UpdatePrompt />
    </BrowserRouter>
  )
}
