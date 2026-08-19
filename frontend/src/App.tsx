import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { ChakraProvider, Box } from '@chakra-ui/react';
import theme from './theme';
import { Lists } from './pages/Lists';
import { ListDetail } from './pages/ListDetail';
import { Learn } from './pages/Learn';
import { Quiz } from './pages/Quiz';
import { TemplateLibrary } from './pages/TemplateLibrary';
import { WordDetailPage } from './pages/WordDetail';
import { Settings } from './pages/Settings';
import { ImageDescription } from './pages/ImageDescription';
import { GetNewWords } from './pages/GetNewWords';
import { WordLearningSession } from './pages/WordLearningSession';
import { ReadingPage } from './pages/ReadingPage';
import { VoiceChat } from './pages/VoiceChat';
import { Header } from './components/Header';
import { Landing } from './pages/Landing';
import { ArticlePreview } from './pages/ArticlePreview';
import { LessonPage } from './pages/LessonPage';
import { LessonQuizPage } from './pages/LessonQuizPage';
import { VocabularyPage } from './pages/VocabularyPage';
import { ReviewPage } from './pages/ReviewPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AuthProvider } from './auth/AuthContext';

const LegacyLayout = () => (
  <Box bg="slate.900" minH="100vh" color="white">
    <Header />
    <Outlet />
  </Box>
);

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <AuthProvider>
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/articles/:id" element={<ArticlePreview />} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            <Route path="/lesson-quizzes/:id" element={<LessonQuizPage />} />
            <Route path="/vocabulary" element={<VocabularyPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/account/settings" element={<AccountSettingsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route element={<LegacyLayout />}>
            <Route path="/lists" element={<Lists />} />
            <Route path="/lists/:id" element={<ListDetail />} />
            <Route path="/learn/:id" element={<Learn />} />
            <Route path="/quiz/:id" element={<Quiz />} />
            <Route path="/templates" element={<TemplateLibrary />} />
            <Route path="/words/:wordId" element={<WordDetailPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/describe" element={<ImageDescription />} />
            <Route path="/learn-new-words" element={<GetNewWords />} />
            <Route path="/learn-new-words/session" element={<WordLearningSession />} />
            <Route path="/reading/:listId" element={<ReadingPage />} />
            <Route path="/voice-chat/:listId" element={<VoiceChat />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
}

export default App;
