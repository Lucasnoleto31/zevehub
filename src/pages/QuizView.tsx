import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Trophy,
  Zap,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";

interface Quiz {
  id: string;
  module_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string;
  points: number;
  passing_score: number;
}

interface Question {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  order_index: number;
}

const QuizView = () => {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Admin state
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    options: ["", "", "", ""],
    correct_answer: 0,
    explanation: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setIsAdmin(roles?.some((r) => r.role === "admin") || false);
      await loadQuizData();
    };

    checkAuth();
  }, [navigate, quizId]);

  const loadQuizData = async () => {
    setLoading(true);
    try {
      // Load quiz
      const { data: quizData, error: quizError } = await supabase
        .from("learning_quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError || !quizData) {
        toast.error("Quiz não encontrado");
        navigate("/aprenda");
        return;
      }

      setQuiz(quizData);

      // Load questions
      const { data: questionsData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index");

      const formattedQuestions = (questionsData || []).map(q => ({
        ...q,
        options: q.options as string[],
        explanation: q.explanation as string | null,
      }));
      setQuestions(formattedQuestions);

    } catch (error) {
      console.error("Error loading quiz:", error);
      toast.error("Erro ao carregar quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: answerIndex,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correct_answer) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  };

  const handleSubmit = async () => {
    if (!userId || !quiz) return;
    setSubmitting(true);
    
    try {
      const score = calculateScore();
      const passed = score.percentage >= quiz.passing_score;

      // Save result
      const { error } = await supabase.from("user_quiz_results").insert({
        user_id: userId,
        quiz_id: quiz.id,
        score: score.correct,
        total_questions: score.total,
        passed,
        answers: selectedAnswers,
      });

      if (error) throw error;

      // Award points if passed
      if (passed) {
        await supabase.rpc("increment_column", {
          table_name: "profiles",
          column_name: "points",
          increment_value: quiz.points,
          row_id: userId,
        });
      }

      setShowResults(true);
      toast.success(passed ? `Parabéns! Você passou! +${quiz.points} pontos` : "Quiz finalizado!");

    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Erro ao enviar resultado");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!quizId || !newQuestion.question || newQuestion.options.some(o => !o)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: quizId,
        question: newQuestion.question,
        options: newQuestion.options,
        correct_answer: newQuestion.correct_answer,
        explanation: newQuestion.explanation || null,
        order_index: questions.length + 1,
      });

      if (error) throw error;
      toast.success("Pergunta adicionada com sucesso!");
      setShowAddQuestion(false);
      setNewQuestion({
        question: "",
        options: ["", "", "", ""],
        correct_answer: 0,
        explanation: "",
      });
      await loadQuizData();
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("Erro ao adicionar pergunta");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta pergunta?")) return;
    try {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
      if (error) throw error;
      toast.success("Pergunta excluída com sucesso!");
      await loadQuizData();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Erro ao excluir pergunta");
    }
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const score = calculateScore();
  const answeredCount = Object.keys(selectedAnswers).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background">
        <AppSidebar isAdmin={isAdmin} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => navigate("/aprenda")}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {quiz.points} pts
              </Badge>
            </div>

            {/* Quiz Title */}
            <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-purple-500/20">
                    <Trophy className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{quiz.title}</h1>
                    <p className="text-muted-foreground">{quiz.description}</p>
                    <p className="text-sm text-purple-400 mt-1">
                      Nota mínima para aprovação: {quiz.passing_score}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin: Add Question */}
            {isAdmin && !showResults && (
              <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pergunta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Pergunta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Pergunta</Label>
                      <Textarea
                        value={newQuestion.question}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                        placeholder="Digite a pergunta..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Opções de Resposta</Label>
                      {newQuestion.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <RadioGroup
                            value={newQuestion.correct_answer.toString()}
                            onValueChange={(v) => setNewQuestion({ ...newQuestion, correct_answer: parseInt(v) })}
                          >
                            <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} />
                          </RadioGroup>
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newQuestion.options];
                              newOptions[idx] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: newOptions });
                            }}
                            placeholder={`Opção ${idx + 1}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Selecione o botão ao lado da resposta correta
                      </p>
                    </div>
                    <div>
                      <Label>Explicação (opcional)</Label>
                      <Textarea
                        value={newQuestion.explanation}
                        onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                        placeholder="Explicação da resposta correta..."
                      />
                    </div>
                    <Button onClick={handleAddQuestion} disabled={saving} className="w-full">
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Salvar Pergunta
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Results Screen */}
            {showResults ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <Card className={`border-2 ${score.percentage >= quiz.passing_score ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10'}`}>
                  <CardContent className="py-12 text-center">
                    {score.percentage >= quiz.passing_score ? (
                      <>
                        <Trophy className="w-20 h-20 mx-auto text-emerald-400 mb-4" />
                        <h2 className="text-3xl font-bold text-emerald-400 mb-2">Parabéns!</h2>
                        <p className="text-xl text-muted-foreground mb-4">Você passou no quiz!</p>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-20 h-20 mx-auto text-red-400 mb-4" />
                        <h2 className="text-3xl font-bold text-red-400 mb-2">Não foi dessa vez</h2>
                        <p className="text-xl text-muted-foreground mb-4">Tente novamente!</p>
                      </>
                    )}
                    
                    <div className="text-6xl font-bold mb-2">{score.percentage}%</div>
                    <p className="text-lg text-muted-foreground">
                      {score.correct} de {score.total} questões corretas
                    </p>
                    
                    <div className="flex justify-center gap-4 mt-8">
                      <Button variant="outline" onClick={handleRestart}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Tentar Novamente
                      </Button>
                      <Button onClick={() => navigate("/aprenda")}>
                        Voltar ao Aprenda
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Answer Review */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle>Revisão das Respostas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {questions.map((q, idx) => {
                      const userAnswer = selectedAnswers[idx];
                      const isCorrect = userAnswer === q.correct_answer;
                      
                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-lg border ${
                            isCorrect ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-emerald-400 mt-1" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400 mt-1" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium mb-2">{idx + 1}. {q.question}</p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">Sua resposta: </span>
                                <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                                  {q.options[userAnswer]}
                                </span>
                              </p>
                              {!isCorrect && (
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Resposta correta: </span>
                                  <span className="text-emerald-400">{q.options[q.correct_answer]}</span>
                                </p>
                              )}
                              {q.explanation && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  {q.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            ) : questions.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma pergunta disponível</h3>
                  <p className="text-muted-foreground">
                    {isAdmin ? "Adicione a primeira pergunta para começar." : "Em breve teremos perguntas disponíveis."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Pergunta {currentQuestionIndex + 1} de {questions.length}</span>
                    <span>{answeredCount} respondidas</span>
                  </div>
                  <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
                </div>

                {/* Question Card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Pergunta {currentQuestionIndex + 1}</Badge>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteQuestion(currentQuestion.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <CardTitle className="text-xl mt-4">{currentQuestion.question}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup
                          value={selectedAnswers[currentQuestionIndex]?.toString()}
                          onValueChange={(v) => handleSelectAnswer(parseInt(v))}
                          className="space-y-3"
                        >
                          {currentQuestion.options.map((option, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                                selectedAnswers[currentQuestionIndex] === idx
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border/50 hover:border-primary/50 hover:bg-muted/50'
                              }`}
                              onClick={() => handleSelectAnswer(idx)}
                            >
                              <RadioGroupItem value={idx.toString()} id={`answer-${idx}`} />
                              <Label htmlFor={`answer-${idx}`} className="flex-1 cursor-pointer">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>

                  <div className="flex gap-2">
                    {questions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          idx === currentQuestionIndex
                            ? 'bg-primary scale-125'
                            : selectedAnswers[idx] !== undefined
                            ? 'bg-emerald-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>

                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={answeredCount < questions.length || submitting}
                      className="bg-gradient-to-r from-purple-500 to-pink-500"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trophy className="w-4 h-4 mr-2" />
                      )}
                      Finalizar Quiz
                    </Button>
                  ) : (
                    <Button onClick={handleNext}>
                      Próxima
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default QuizView;
