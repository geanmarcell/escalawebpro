import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  CalendarDays, 
  Settings, 
  LogOut, 
  Plus, 
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Lock,
  Download,
  Eye,
  Pencil,
  Trash2,
  User as UserIcon,
  Briefcase,
  Layers,
  Cake,
  PlaneTakeoff,
  Stethoscope,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Employee, User, UserPermission, AppConfig, Holiday } from './types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isSunday, 
  differenceInDays, 
  getDay, 
  parseISO, 
  differenceInWeeks, 
  addDays,
  setDate,
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- HELPERS ---
function getEaster(year: number) {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

function getFixedHolidays(year: number): Holiday[] {
  return [
    { id: 'f1', data: `${year}-01-01`, descricao: 'Ano Novo' },
    { id: 'f2', data: `${year}-04-21`, descricao: 'Tiradentes' },
    { id: 'f3', data: `${year}-05-01`, descricao: 'Dia do Trabalho' },
    { id: 'f4', data: `${year}-07-09`, descricao: 'Revolução Constitucionalista' },
    { id: 'f5', data: `${year}-08-15`, descricao: 'Aniversário de Sorocaba' },
    { id: 'f6', data: `${year}-09-07`, descricao: 'Independência do Brasil' },
    { id: 'f7', data: `${year}-10-12`, descricao: 'Nossa Senhora Aparecida' },
    { id: 'f8', data: `${year}-11-02`, descricao: 'Finados' },
    { id: 'f9', data: `${year}-11-15`, descricao: 'Proclamação da República' },
    { id: 'f10', data: `${year}-11-20`, descricao: 'Consciência Negra' },
    { id: 'f11', data: `${year}-12-25`, descricao: 'Natal' }
  ];
}

function getVariableHolidays(year: number): Holiday[] {
  const easter = getEaster(year);
  const santaSexta = subDays(easter, 2);
  const corpusChristi = addDays(easter, 60);

  return [
    { id: 'v1', data: format(santaSexta, 'yyyy-MM-dd'), descricao: 'Sexta-feira Santa' },
    { id: 'v2', data: format(corpusChristi, 'yyyy-MM-dd'), descricao: 'Corpus Christi' }
  ];
}

function getAllHolidaysForYear(year: number, customHolidays: Holiday[] = []): Holiday[] {
  const fixed = getFixedHolidays(year);
  const variable = getVariableHolidays(year);
  return [...fixed, ...variable, ...customHolidays];
}

const formatDisplayDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

function getVacationInfo(employee: Employee) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!employee.admissao) {
    return { status: 'Em dia', diasVencido: 0, color: 'bg-emerald-100 text-emerald-800' };
  }

  const parseLocal = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const admissionDate = parseLocal(employee.admissao);
  let lastVacationDate: Date | null = null;
  if (employee.ferias) {
    lastVacationDate = parseLocal(employee.ferias);
  }

  // "Agendada" if the date is in the future
  if (lastVacationDate && lastVacationDate >= today) {
    return { status: 'Agendada', diasVencido: 0, color: 'bg-amber-100 text-amber-800 border border-amber-200' };
  }

  // Overdue logic: In Brazil, you earn 30 days after 12 months. 
  // You have another 12 months to take them. If not taken by then, it's overdue.
  // The user says "com base na data de entrada e da ultima ferias tirada".
  
  // Reference for the last completed earning period
  const referenceDate = lastVacationDate && lastVacationDate < today 
    ? lastVacationDate 
    : admissionDate;

  // Deadline is usually admission + (cycles + 1) * 12 months.
  // Let's use 12 months from the last event as the "limit" for this simplified system.
  const deadlineDate = addMonths(referenceDate, 12);
  
  if (today > deadlineDate) {
    const overdueDays = differenceInDays(today, deadlineDate);
    return { status: 'Vencida', diasVencido: overdueDays, color: 'bg-red-100 text-red-800 border border-red-200' };
  }

  return { status: 'Em dia', diasVencido: 0, color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
}

// Views
type View = 'gerenciar' | 'escala' | 'escalaSemanal' | 'configuracao';

// --- LOGICA DE ESCALA ---
function isEmployeeOff(employee: Employee, date: Date, holidays: Holiday[] = []): { isOff: boolean; isSundayAlert: boolean; isHoliday: boolean; isVacation: boolean; isLeave: boolean } {
  const isHoliday = holidays.some(h => isSameDay(parseISO(h.data), date));
  
  // Verificação de Licença/Afastamento
  let isLeave = false;
  if (employee.licencaInicio && employee.licencaFim) {
    const lStart = parseISO(employee.licencaInicio);
    const lEnd = parseISO(employee.licencaFim);
    if (date >= lStart && date <= lEnd) {
      isLeave = true;
    }
  }

  // Verificação de Férias
  let isVacation = false;
  if (employee.ferias && employee.diasFerias > 0) {
    const vStart = parseISO(employee.ferias);
    const vEnd = addDays(vStart, employee.diasFerias - 1);
    if (date >= vStart && date <= vEnd) {
      isVacation = true;
    }
  }

  if (!employee.tipoEscala) return { isOff: false, isSundayAlert: false, isHoliday, isVacation, isLeave };

  const dayOfWeek = getDay(date); // 0 = Domingo, 1 = Segunda...
  let isSundayAlert = false;

  // Regra especial para Domingo 2x1 (se folga de domingo estiver cadastrada e for escala 6x1)
  if (employee.tipoEscala === '6x1' && employee.folgaDomingo && dayOfWeek === 0) {
    const firstSundayOff = parseISO(employee.folgaDomingo);
    const weeksDiff = differenceInWeeks(date, firstSundayOff);
    
    // Se weeksDiff % 3 === 0, significa que é o domingo de folga (Ciclo: Folga-Trabalha-Trabalha)
    if (weeksDiff >= 0 && weeksDiff % 3 === 0) {
      return { isOff: true, isSundayAlert: true, isHoliday, isVacation, isLeave };
    }
    // Se não for folga mas for domingo, marcamos como alerta para indicar que é domingo de trabalho
    return { isOff: false, isSundayAlert: true, isHoliday, isVacation, isLeave };
  }

  // Lógica padrão baseada na escala e na data de referência (Folga Semanal ou Admissão)
  const refDateStr = employee.folgaSemanal || employee.admissao;
  const refDate = parseISO(refDateStr);
  const diffDays = differenceInDays(date, refDate);

  // Se a data solicitada for anterior à referência, não calculamos corretamente
  if (diffDays < 0) return { isOff: false, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };

  switch (employee.tipoEscala) {
    case '6x1': {
      const offDayOfWeek = getDay(refDate);
      return { isOff: dayOfWeek === offDayOfWeek, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    }
    case '12x36':
      return { isOff: diffDays % 2 !== 0, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    case '5x2': {
      const offDay1 = getDay(refDate);
      const offDay2 = (offDay1 + 1) % 7;
      return { isOff: dayOfWeek === offDay1 || dayOfWeek === offDay2, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    }
    case '4x2':
      return { isOff: (diffDays % 6) >= 4, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    case '4x3':
      return { isOff: (diffDays % 7) >= 4, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    case '12x24':
      return { isOff: diffDays % 2 !== 0, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    case '6x2':
      return { isOff: (diffDays % 8) >= 6, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    case '24x72':
      return { isOff: (diffDays % 4) !== 0, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    case '3x3':
      return { isOff: (diffDays % 6) >= 3, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    case '2x2':
      return { isOff: (diffDays % 4) >= 2, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    case '5x1':
      return { isOff: (diffDays % 6) === 5, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
    default:
      return { isOff: false, isSundayAlert: dayOfWeek === 0, isHoliday, isVacation, isLeave };
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>('gerenciar');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Persistence (Simplified local storage management)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    primeiroDia: 21,
    logoImg: null,
    logoWidth: 150,
    logoHeight: 150,
    feriados: []
  });
  const [users, setUsers] = useState<User[]>([{ usuario: 'Admin' }]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([
    {
      usuario: 'Admin',
      adicionarUsuarios: true,
      adicionarFuncionarios: true,
      editarFuncionarios: true,
      excluirFuncionarios: true
    }
  ]);
  
  useEffect(() => {
    const savedEmployees = localStorage.getItem('escala_employees');
    if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
    
    const savedConfig = localStorage.getItem('escala_config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    
    const savedUsers = localStorage.getItem('escala_users');
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    
    const savedPermissions = localStorage.getItem('escala_permissions');
    if (savedPermissions) setUserPermissions(JSON.parse(savedPermissions));

    if (!savedEmployees) {
      // Pre-populate with mock data for demonstration
      const mockEmployees: Employee[] = [
        {
          id: 1, cracha: '001', nome: 'João Silva', funcao: 'Operador de Produção', setor: 'Operacional',
          admissao: '2023-01-10', folgaSemanal: '2023-01-01', folgaDomingo: '2023-01-05',
          turno: 'Manhã', ferias: null, diasFerias: 0, nascimento: '1990-05-15',
          horaEntrada: '06:00', horaSaida: '14:20', tipoEscala: '6x1', licencaInicio: null, licencaFim: null
        },
        {
          id: 2, cracha: '002', nome: 'Maria Oliveira', funcao: 'Líder de Equipe', setor: 'Operacional',
          admissao: '2022-03-15', folgaSemanal: '2022-03-01', folgaDomingo: '2022-03-06',
          turno: 'Tarde', ferias: null, diasFerias: 0, nascimento: '1988-11-20',
          horaEntrada: '14:20', horaSaida: '22:40', tipoEscala: '6x1', licencaInicio: null, licencaFim: null
        },
        {
          id: 3, cracha: '003', nome: 'Carlos Souza', funcao: 'Auxiliar de Limpeza', setor: 'Limpeza',
          admissao: '2024-02-01', folgaSemanal: '2024-02-05', folgaDomingo: '2024-02-11',
          turno: 'Manhã', ferias: null, diasFerias: 0, nascimento: '1995-07-30',
          horaEntrada: '07:00', horaSaida: '15:20', tipoEscala: '5x2', licencaInicio: null, licencaFim: null
        },
        {
          id: 4, cracha: '004', nome: 'Ana Costa', funcao: 'Recepcionista', setor: 'Recepção',
          admissao: '2023-10-10', folgaSemanal: '2023-10-02', folgaDomingo: '2023-10-08',
          turno: 'Manhã', ferias: null, diasFerias: 0, nascimento: '1992-04-12',
          horaEntrada: '08:00', horaSaida: '17:00', tipoEscala: '5x2', licencaInicio: null, licencaFim: null
        },
        {
          id: 5, cracha: '005', nome: 'Pedro Santos', funcao: 'Agente de Portaria', setor: 'Segurança',
          admissao: '2024-01-01', folgaSemanal: '2024-01-02', folgaDomingo: '2024-01-07',
          turno: 'Noite', ferias: null, diasFerias: 0, nascimento: '1985-12-25',
          horaEntrada: '19:00', horaSaida: '07:00', tipoEscala: '12x36', licencaInicio: null, licencaFim: null
        }
      ];
      setEmployees(mockEmployees);
      localStorage.setItem('escala_employees', JSON.stringify(mockEmployees));
    }
    
    const sessao = sessionStorage.getItem('usuarioLogado');
    if (sessao) {
      setCurrentUser(sessao);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified login for demo purposes
    if ((loginUser === 'Admin' && loginPass === '123456') || (loginUser === 'user' && loginPass === 'pass')) {
      setCurrentUser(loginUser);
      setIsAuthenticated(true);
      sessionStorage.setItem('usuarioLogado', loginUser);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem('usuarioLogado');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-code-bg flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-surface p-10 rounded-xl shadow-2xl border border-border/10">
            <div className="flex flex-col items-center mb-10">
              <div className="bg-primary p-3 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-extrabold text-text tracking-tight uppercase">Code_Analyst.io</h1>
              <p className="text-secondary text-xs mt-2 uppercase tracking-widest font-bold">Escala Management Platform</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <h3 className="section-label">Usuário</h3>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 text-secondary w-5 h-5" />
                  <input 
                    type="text" 
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full bg-bg border border-border text-text rounded-md py-3 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                    placeholder="Admin"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="section-label">Senha</h3>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-secondary w-5 h-5" />
                  <input 
                    type="password" 
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full bg-bg border border-border text-text rounded-md py-3 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-warning/10 border-l-4 border-warning text-warning p-4 rounded-md text-xs font-bold"
                >
                  Credenciais inválidas. Tente novamente.
                </motion.div>
              )}
              
              <button 
                type="submit"
                className="w-full btn-primary justify-center py-4"
              >
                <span>Autenticar Sistema</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
            
            <div className="mt-10 pt-8 border-t border-border flex justify-between items-center text-[10px] uppercase font-bold text-secondary tracking-widest">
              <span>Modelo v4.1</span>
              <span>Admin: 123456</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 bg-surface border-b border-border px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="font-extrabold text-xl text-primary tracking-tighter uppercase">ESCALA WEB FREE</div>
          <div className="h-4 w-px bg-border hidden lg:block"></div>
          <h2 className="font-bold text-xs text-secondary uppercase tracking-[0.2em] hidden lg:block">
            {activeView === 'gerenciar' ? 'Análise de Equipe' : 
             activeView === 'escala' ? 'Plano de Atividades' : 
             activeView === 'escalaSemanal' ? 'Janela Operacional' : 'Controles'}
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
             <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
             <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Sistema Ativo</span>
          </div>
          <button className="btn-outline py-2 px-3">
             <Bell className="w-4 h-4" />
          </button>
          <button 
            onClick={handleLogout}
            className="btn-primary py-2 px-6"
          >
             <LogOut className="w-4 h-4" />
             <span>Sair</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-72 bg-surface border-r border-border p-8 flex flex-col gap-10">
          <div className="flex flex-col items-center gap-4 mb-4">
            {config.logoImg ? (
              <img 
                src={config.logoImg} 
                alt="Logo" 
                style={{ width: `${config.logoWidth}px`, height: `${config.logoHeight}px` }}
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-2xl">
                EW
              </div>
            )}
            <span className="text-xs font-bold text-secondary uppercase tracking-[0.3em]">Gestão Escala</span>
          </div>

          <div>
            <h3 className="section-label">Navegação Principal</h3>
            <div className="flex flex-col gap-1">
              <NavItem 
                active={activeView === 'gerenciar'} 
                onClick={() => setActiveView('gerenciar')}
                icon={Users}
                label="Funcionários"
              />
              <NavItem 
                active={activeView === 'escala'} 
                onClick={() => setActiveView('escala')}
                icon={Calendar}
                label="Escala Mensal"
              />
              <NavItem 
                active={activeView === 'escalaSemanal'} 
                onClick={() => setActiveView('escalaSemanal')}
                icon={CalendarDays}
                label="Escala Semanal"
              />
            </div>
          </div>

          <div>
             <h3 className="section-label">Configuração</h3>
             <NavItem 
                active={activeView === 'configuracao'} 
                onClick={() => setActiveView('configuracao')}
                icon={Settings}
                label="Preferências"
              />
          </div>

          <div className="mt-auto">
             <div className="metric-card bg-surface">
                <div className="metric-label text-[10px] uppercase tracking-widest font-bold mb-1">Performance</div>
                <div className="metric-value text-xl font-black">94%</div>
                <div className="w-full bg-border h-1 rounded-full mt-3 overflow-hidden">
                   <div className="bg-accent h-full w-[94%]"></div>
                </div>
             </div>
          </div>
        </nav>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-10 bg-bg">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'gerenciar' && <GerenciarView employees={employees} setEmployees={setEmployees} />}
              {activeView === 'escala' && <EscalaMensalView employees={employees} config={config} />}
              {activeView === 'escalaSemanal' && <EscalaSemanalView employees={employees} holidays={config.feriados} />}
              {activeView === 'configuracao' && (
                <ConfiguracaoView 
                  employees={employees} 
                  setEmployees={setEmployees}
                  config={config}
                  setConfig={(newConfig) => {
                    setConfig(newConfig);
                    localStorage.setItem('escala_config', JSON.stringify(newConfig));
                  }}
                  users={users}
                  setUsers={(newUsers) => {
                    setUsers(newUsers);
                    localStorage.setItem('escala_users', JSON.stringify(newUsers));
                  }}
                  userPermissions={userPermissions}
                  setUserPermissions={(newPerms) => {
                    setUserPermissions(newPerms);
                    localStorage.setItem('escala_permissions', JSON.stringify(newPerms));
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// Side Nav Item Component
function NavItem({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-md transition-all group",
        active 
          ? "bg-primary/10 text-primary border-l-4 border-primary" 
          : "text-secondary hover:bg-slate-50 hover:text-text"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-secondary")} />
        <span className="text-sm font-bold tracking-tight">{label}</span>
      </div>
      {active && <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

// Views Implementation (Simplified for brevity in initial turn)

function GerenciarView({ employees, setEmployees }: { employees: Employee[], setEmployees: (e: Employee[]) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);

  const initialFormState: Omit<Employee, 'id'> = {
    cracha: '',
    nome: '',
    funcao: '',
    setor: '',
    admissao: '',
    folgaSemanal: '',
    folgaDomingo: '',
    turno: 'Manhã',
    ferias: null,
    diasFerias: 0,
    nascimento: '',
    horaEntrada: '08:00',
    horaSaida: '17:00',
    tipoEscala: '',
    licencaInicio: null,
    licencaFim: null
  };

  const [formState, setFormState] = useState(initialFormState);

  const filtered = employees.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.cracha.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.funcao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', employee?: Employee) => {
    setModalMode(mode);
    if (employee) {
      setSelectedEmployee(employee);
      setFormState({ ...employee });
    } else {
      setSelectedEmployee(null);
      setFormState(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (modalMode === 'view') return setIsModalOpen(false);

    let updatedEmployees: Employee[];
    if (modalMode === 'add') {
      const newEmployee: Employee = {
        ...formState,
        id: employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1
      } as Employee;
      updatedEmployees = [...employees, newEmployee];
    } else {
      updatedEmployees = employees.map(e => e.id === selectedEmployee?.id ? { ...formState, id: e.id } as Employee : e);
    }

    setEmployees(updatedEmployees);
    localStorage.setItem('escala_employees', JSON.stringify(updatedEmployees));
    setIsModalOpen(false);
  };

  const askDelete = (id: number) => {
    setEmployeeToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (employeeToDelete !== null) {
      const updated = employees.filter(e => e.id !== employeeToDelete);
      setEmployees(updated);
      localStorage.setItem('escala_employees', JSON.stringify(updated));
      setIsDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="section-label mb-1">Módulo de Ativos</h3>
          <h1 className="text-3xl font-black text-text tracking-tighter">Equipe de Trabalho</h1>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-md text-xs transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Cadastrar Novo</span>
        </button>
      </div>

      <div className="card-geometric bg-surface p-0 overflow-hidden">
        <div className="p-8 pb-0">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-3.5 text-secondary w-5 h-5" />
            <input 
              type="text" 
              placeholder="Filtrar por crachá, nome, cargo ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-md py-3 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Crachá</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Nome</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Cargo</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Setor</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Admissão</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Férias</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Status das Férias</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Dias Vencido</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-[#F8FAFC]">
              {filtered.length > 0 ? filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-5 text-sm font-medium text-text">{emp.cracha}</td>
                  <td className="px-6 py-5 text-sm font-medium text-text">{emp.nome}</td>
                  <td className="px-6 py-5 text-sm text-secondary font-medium">{emp.funcao}</td>
                  <td className="px-6 py-5 text-sm text-secondary font-medium">{emp.setor}</td>
                  <td className="px-6 py-5 text-sm text-secondary font-medium">
                    {formatDisplayDate(emp.admissao)}
                  </td>
                  <td className="px-6 py-5 text-sm text-secondary font-medium">
                    {emp.ferias ? `${formatDisplayDate(emp.ferias)} (${emp.diasFerias} dias)` : '-'}
                  </td>
                  <td className="px-6 py-5 text-sm">
                    {(() => {
                      const vac = getVacationInfo(emp);
                      return (
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                          vac.color
                        )}>
                          {vac.status}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5 text-sm text-secondary font-bold">
                    {(() => {
                      const vac = getVacationInfo(emp);
                      return vac.diasVencido > 0 ? `${vac.diasVencido} dias` : '-';
                    })()}
                  </td>
                  <td className="px-6 py-5 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal('edit', emp)}
                        className="bg-white border border-border p-1.5 rounded-md text-secondary hover:text-primary transition-all shadow-sm"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => askDelete(emp.id)}
                        className="bg-white border border-border p-1.5 rounded-md text-secondary hover:text-red-500 transition-all shadow-sm"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-secondary italic text-sm">
                    Filtro vazio. Nenhum colaborador indexado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="bg-bg p-4 flex items-center justify-between border-t border-border">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Mostrando 1 de 1 páginas</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-300 text-white rounded text-[10px] font-bold uppercase cursor-not-allowed">Anterior</button>
            <button className="px-4 py-2 bg-blue-400 text-white rounded text-[10px] font-bold uppercase cursor-not-allowed">Próxima</button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-text/40 backdrop-blur-sm"
              onClick={() => setIsDeleteConfirmOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-surface p-8 rounded-xl shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-text mb-2">Excluir Colaborador?</h2>
              <p className="text-secondary text-sm mb-8">Esta ação não pode ser desfeita. O colaborador será removido permanentemente.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-secondary font-bold rounded-lg text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-text/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-surface w-full max-w-xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-5 border-b border-border bg-surface flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">
                  {modalMode === 'add' ? 'Cadastrar Funcionário' : 
                   modalMode === 'edit' ? 'Editar Funcionário' : 'Visualizar Funcionário'}
                </h2>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Crachá:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="text" 
                      value={formState.cracha}
                      onChange={(e) => setFormState({...formState, cracha: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Nome:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="text" 
                      value={formState.nome}
                      onChange={(e) => setFormState({...formState, nome: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Função:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="text" 
                      value={formState.funcao}
                      onChange={(e) => setFormState({...formState, funcao: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Setor:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="text" 
                      value={formState.setor}
                      onChange={(e) => setFormState({...formState, setor: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Admissão:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="date" 
                      value={formState.admissao}
                      onChange={(e) => setFormState({...formState, admissao: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Primeira Folga Semanal:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="date" 
                      value={formState.folgaSemanal}
                      onChange={(e) => setFormState({...formState, folgaSemanal: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Primeira Folga de Domingo:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="date" 
                      value={formState.folgaDomingo}
                      onChange={(e) => setFormState({...formState, folgaDomingo: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Turno:</label>
                    <select 
                      disabled={modalMode === 'view'}
                      value={formState.turno}
                      onChange={(e) => setFormState({...formState, turno: e.target.value as any})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Manhã">Manhã</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Noite">Noite</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Data de Férias:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="date" 
                      value={formState.ferias || ''}
                      onChange={(e) => setFormState({...formState, ferias: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Dias de Férias:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="text" 
                      value={formState.diasFerias}
                      onChange={(e) => setFormState({...formState, diasFerias: Number(e.target.value) || 0})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Data de Nascimento:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="date" 
                      value={formState.nascimento || ''}
                      onChange={(e) => setFormState({...formState, nascimento: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Horário de Entrada:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="time" 
                      value={formState.horaEntrada}
                      onChange={(e) => setFormState({...formState, horaEntrada: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Horário de Saída:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="time" 
                      value={formState.horaSaida}
                      onChange={(e) => setFormState({...formState, horaSaida: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Tipo de Escala:</label>
                    <select 
                      disabled={modalMode === 'view'}
                      value={formState.tipoEscala}
                      onChange={(e) => setFormState({...formState, tipoEscala: e.target.value as any})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Selecione</option>
                      <option value="6x1">6x1</option>
                      <option value="12x36">12x36</option>
                      <option value="5x2">5x2</option>
                      <option value="4x2">4x2</option>
                      <option value="4x3">4x3</option>
                      <option value="12x24">12x24</option>
                      <option value="6x2">6x2</option>
                      <option value="24x72">24x72</option>
                      <option value="3x3">3x3</option>
                      <option value="2x2">2x2</option>
                      <option value="5x1">5x1</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Início da Licença:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="date" 
                      value={formState.licencaInicio || ''}
                      onChange={(e) => setFormState({...formState, licencaInicio: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text">Término da Licença:</label>
                    <input 
                      disabled={modalMode === 'view'}
                      type="date" 
                      value={formState.licencaFim || ''}
                      onChange={(e) => setFormState({...formState, licencaFim: e.target.value})}
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {modalMode !== 'view' && (
                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      onClick={handleSave}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 px-6 rounded-lg text-sm transition-colors"
                    >
                      Salvar
                    </button>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="bg-[#6c757d] hover:bg-[#5a6268] text-white font-bold py-1.5 px-6 rounded-lg text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EscalaMensalView({ employees, config }: { employees: Employee[], config: AppConfig }) {
  const [selectedSetor, setSelectedSetor] = useState('Todos');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const [params, setParams] = useState({ setor: 'Todos', ano: new Date().getFullYear(), mes: new Date().getMonth() });

  const sectors = ['Todos', ...Array.from(new Set(employees.map(e => e.setor).filter(Boolean)))];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const handleGerarEscala = () => setParams({ setor: selectedSetor, ano: selectedYear, mes: selectedMonth });
  const handlePrint = () => {
    if (window.self !== window.top) {
      alert("Dica: Para imprimir corretamente em PDF ou papel, recomendamos abrir o sistema em uma nova aba (ícone no topo direito) para evitar bloqueios do navegador.");
    }
    window.print();
  };

  const baseDate = new Date(params.ano, params.mes, 1);
  const cycleStart = setDate(startOfMonth(baseDate), config.primeiroDia);
  const cycleEnd = subDays(addMonths(cycleStart, 1), 1);
  const daysInCycle = eachDayOfInterval({ start: cycleStart, end: cycleEnd });
  
  const yearsInCycle = Array.from(new Set([cycleStart.getFullYear(), cycleEnd.getFullYear()]));
  const holidays = yearsInCycle.flatMap(y => getAllHolidaysForYear(y, config.feriados));

  const shiftOrder: Record<string, number> = { 'Manhã': 1, 'Tarde': 2, 'Noite': 3 };
  const displayedEmployees = employees
    .filter(e => params.setor === 'Todos' || e.setor === params.setor)
    .sort((a, b) => (shiftOrder[a.turno] || 99) - (shiftOrder[b.turno] || 99));

  const birthdays = employees.filter(e => {
    if (!e.nascimento) return false;
    const [, bMonth, bDay] = e.nascimento.split('-').map(Number);
    return daysInCycle.some(d => (d.getMonth() + 1) === bMonth && d.getDate() === bDay);
  }).sort((a, b) => {
    const dayA = parseInt(a.nascimento!.split('-')[2]);
    const dayB = parseInt(b.nascimento!.split('-')[2]);
    return dayA - dayB;
  });

  const periodHolidays = holidays.filter(h => {
    const d = parseISO(h.data);
    return d >= cycleStart && d <= cycleEnd;
  });

  return (
    <div className="space-y-6 print:space-y-0 print:p-0">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-lg border border-border flex flex-wrap items-end gap-3 shadow-sm print:hidden">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-secondary uppercase tracking-tight">Setor:</label>
          <select value={selectedSetor} onChange={(e) => setSelectedSetor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary">
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-secondary uppercase tracking-tight">Ano:</label>
          <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-24 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="space-y-1 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold text-secondary uppercase tracking-tight">Mês:</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary">
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <button onClick={handleGerarEscala} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-[34px] px-4 rounded-md text-xs transition-colors">Gerar Escala</button>
        <button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-[34px] px-4 rounded-md text-xs transition-colors flex items-center gap-2"><Printer className="w-4 h-4" />Imprimir</button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-border shadow-sm min-w-[1000px] print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col items-center mb-8 relative min-h-[96px]">
          <div className="absolute left-0 top-0 h-24 w-24 flex items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-slate-50 print:border-none print:bg-transparent">
            {config.logoImg ? <img src={config.logoImg} alt="Logo" className="max-w-full max-h-full object-contain p-2" referrerPolicy="no-referrer" /> : <div className="text-[10px] font-bold text-slate-300 uppercase italic">LOGO</div>}
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mt-6">{params.setor === 'Todos' ? 'GERAL' : params.setor}</h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{format(cycleStart, "d 'de' MMMM", { locale: ptBR })} a {format(cycleEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>

        <div className="overflow-hidden border border-slate-200 rounded-sm mt-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-200">
                <th className="p-2 border-r border-slate-200 text-center w-24">Crachá</th>
                <th className="p-2 border-r border-slate-200 text-left w-64">Nome</th>
                <th className="p-2 border-r border-slate-200 text-center w-32">Cargo</th>
                <th className="p-2 border-r border-slate-200 text-center w-24">Turno</th>
                {daysInCycle.map((d, i) => (
                  <th key={i} className={cn("p-1 border-r border-slate-100 text-center w-8", isSunday(d) && "bg-rose-50 text-red-600")}>{format(d, 'd')}</th>
                ))}
              </tr>
              <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <th colSpan={4} className="border-r border-slate-200"></th>
                {daysInCycle.map((d, i) => (
                  <th key={i} className={cn("p-1 border-r border-slate-100 text-center w-8", isSunday(d) && "bg-rose-50 text-red-600")}>{format(d, 'EEEEEE', { locale: ptBR }).toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedEmployees.map(e => (
                <tr key={e.id} className="text-[10px] font-medium text-slate-600 group hover:bg-slate-50 transition-colors">
                  <td className="p-2 border-r border-slate-200 text-center font-mono">{e.cracha}</td>
                  <td className="p-2 border-r border-slate-200 uppercase truncate max-w-[200px]">{e.nome}</td>
                  <td className="p-2 border-r border-slate-200 text-[9px] uppercase font-bold text-slate-400 text-center">{e.funcao}</td>
                  <td className="p-2 border-r border-slate-200 text-center">{e.turno}</td>
                  {daysInCycle.map((date, i) => {
                    const { isOff, isHoliday, isVacation, isLeave } = isEmployeeOff(e, date, holidays);
                    const isSun = isSunday(date);
                    return (
                      <td key={i} className={cn(
                        "p-0 border-r border-slate-100 text-center size-8 transition-colors",
                        isSun && "bg-rose-100",
                        isHoliday && "bg-amber-100",
                        isVacation && "bg-slate-400 font-bold",
                        isLeave && "bg-purple-700 font-bold"
                      )}>
                        <div className="w-full h-full flex items-center justify-center">
                          {isLeave ? (
                            <div className="w-full h-full text-white font-black flex items-center justify-center text-[9px]">L</div>
                          ) : isVacation ? (
                            <div className="w-full h-full bg-slate-400"></div>
                          ) : isOff ? (
                            <div className="p-0.5 w-full h-full">
                              <div className="w-full h-full bg-emerald-500 text-white font-black flex items-center justify-center rounded-sm text-[9px]">F</div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-12 border-t border-slate-100 pt-8">
           <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-l-4 border-amber-400 pl-3">Feriados</h3>
              <div className="space-y-1">
                {periodHolidays.length > 0 ? periodHolidays.map(h => (
                  <p key={h.id} className="text-[10px] text-slate-600 font-bold flex items-center">
                    <span className="text-slate-400 font-mono w-24 inline-block">{format(parseISO(h.data), 'dd/MM/yyyy')}</span>
                    <span className="uppercase">{h.descricao}</span>
                  </p>
                )) : <p className="text-[10px] text-slate-400 italic font-medium">Nenhum feriado no período selecionado.</p>}
              </div>
           </div>
           <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-l-4 border-primary pl-3">Aniversariantes</h3>
              <div className="space-y-1">
                {birthdays.length > 0 ? birthdays.map(e => (
                  <p key={e.id} className="text-[10px] text-slate-600 font-bold flex items-center">
                    <span className="text-slate-400 font-mono w-14 inline-block">{format(parseISO(e.nascimento!), 'dd/MM')}</span>
                    <span className="uppercase truncate">{e.nome}</span>
                  </p>
                )) : <p className="text-[10px] text-slate-400 italic font-medium">Nenhum aniversariantes.</p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function EscalaSemanalView({ employees, holidays: customHolidays = [] }: { employees: Employee[], holidays?: Holiday[] }) {
  const weekDays = [
    { name: 'Segunda', id: 'seg', offset: 0 },
    { name: 'Terça', id: 'ter', offset: 1 },
    { name: 'Quarta', id: 'qua', offset: 2 },
    { name: 'Quinta', id: 'qui', offset: 3 },
    { name: 'Sexta', id: 'sex', offset: 4 },
    { name: 'Sábado', id: 'sab', offset: 5 },
    { name: 'Domingo', id: 'dom', offset: 6 }
  ];
  
  const today = new Date();
  const startOfThisWeek = addDays(today, -((getDay(today) + 6) % 7)); 

  // Combinar feriados automáticos dos anos presentes na semana atual
  const yearsInWeek = Array.from(new Set([startOfThisWeek.getFullYear(), addDays(startOfThisWeek, 6).getFullYear()]));
  const allHolidays = yearsInWeek.flatMap(y => getAllHolidaysForYear(y, customHolidays));

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-label mb-1">Status Operacional</h3>
          <h1 className="text-3xl font-black text-text tracking-tighter">Janela Semanal</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl">
        {weekDays.map((day) => {
          const date = addDays(startOfThisWeek, day.offset);
          const isHoliday = allHolidays.some(h => isSameDay(parseISO(h.data), date));
          const holidayName = allHolidays.find(h => isSameDay(parseISO(h.data), date))?.descricao;

          return (
            <div key={day.id} className="bg-surface flex flex-col min-h-[500px]">
              <div className={cn(
                "p-6 border-b border-border flex flex-col items-center justify-center gap-1",
                isHoliday ? "bg-primary/5" : day.id === 'dom' ? "bg-warning/5" : "bg-bg/50"
              )}>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">{day.name}</span>
                <span className={cn(
                  "text-2xl font-black tabular-nums",
                  isHoliday ? "text-primary" : day.id === 'dom' ? "text-warning" : "text-text"
                )}>{format(date, 'dd')}</span>
                {isHoliday && (
                  <span className="text-[8px] font-bold text-primary uppercase text-center mt-1 truncate w-full px-2">
                    {holidayName}
                  </span>
                )}
              </div>
              
              <div className="flex-1 p-5 space-y-4">
                {employees.map(e => {
                  const { isOff } = isEmployeeOff(e, date, allHolidays);
                  if (isOff) return null;
                  return (
                    <div key={e.id} className="metric-card bg-surface hover:border-primary transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-black text-primary border border-primary/20 px-2 py-0.5 rounded uppercase tracking-tighter">{e.turno}</span>
                        <span className="text-[9px] font-mono font-bold text-secondary">{e.horaEntrada}</span>
                      </div>
                      <p className="text-xs font-black text-text truncate">{e.nome}</p>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between font-mono text-[9px] text-secondary">
                         <span>S: {e.setor}</span>
                         <ChevronRight className="w-3 h-3 text-border" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfiguracaoView({ 
  employees, 
  setEmployees, 
  config, 
  setConfig, 
  users, 
  setUsers, 
  userPermissions, 
  setUserPermissions 
}: { 
  employees: Employee[], 
  setEmployees: (e: Employee[]) => void, 
  config: AppConfig, 
  setConfig: (c: AppConfig) => void, 
  users: User[], 
  setUsers: (u: User[]) => void, 
  userPermissions: UserPermission[], 
  setUserPermissions: (p: UserPermission[]) => void 
}) {
  const [activeTab, setActiveTab] = useState('geral');
  
  // Local form states
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [newUser, setNewUser] = useState({ usuario: '', senha: '' });
  const [newHoliday, setNewHoliday] = useState({ data: '', descricao: '' });
  const [changePass, setChangePass] = useState({ usuario: 'Admin', senhaAtual: '', novaSenha: '' });

  // Sincronizar estado local se a config global mudar
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const tabs = [
    { id: 'geral', label: 'Geral' },
    { id: 'usuarios', label: 'Usuários' },
    { id: 'permissoes', label: 'Permissões' },
    { id: 'feriados', label: 'Feriados' },
    { id: 'contato', label: 'Contato' },
  ];

  const handleSaveAll = () => {
    // Persistência direta para garantir que funcione
    localStorage.setItem('escala_config', JSON.stringify(localConfig));
    // Atualizar estado global
    setConfig(localConfig);
    alert("Configurações salvas com sucesso!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalConfig({ ...localConfig, logoImg: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackup = () => {
    const blob = new Blob([JSON.stringify(employees, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_escala_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            setEmployees(imported);
            localStorage.setItem('escala_employees', JSON.stringify(imported));
            alert("Backup restaurado com sucesso!");
          }
        } catch (err) {
          alert("Erro ao ler arquivo de backup.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAddUser = () => {
    if (!newUser.usuario || !newUser.senha) return;
    if (users.find(u => u.usuario === newUser.usuario)) return alert("Usuário já existe.");
    
    const updatedUsers = [...users, { usuario: newUser.usuario, senha: newUser.senha }];
    setUsers(updatedUsers);
    
    const updatedPerms = [...userPermissions, {
      usuario: newUser.usuario,
      adicionarUsuarios: false,
      adicionarFuncionarios: false,
      editarFuncionarios: false,
      excluirFuncionarios: false
    }];
    setUserPermissions(updatedPerms);
    
    setNewUser({ usuario: '', senha: '' });
    alert("Usuário adicionado!");
  };

  const handleRemoveUser = (usuario: string) => {
    if (usuario === 'Admin') return alert("O usuário Admin não pode ser removido.");
    setUsers(users.filter(u => u.usuario !== usuario));
    setUserPermissions(userPermissions.filter(p => p.usuario !== usuario));
  };

  const handleTogglePermission = (usuario: string, field: keyof UserPermission) => {
    const updatedPerms = userPermissions.map(p => {
      if (p.usuario === usuario) {
        return { ...p, [field]: !p[field] };
      }
      return p;
    });
    setUserPermissions(updatedPerms);
    localStorage.setItem('escala_permissions', JSON.stringify(updatedPerms));
  };

  const handleAddHoliday = () => {
    if (!newHoliday.data || !newHoliday.descricao) return;
    const holiday: Holiday = {
      id: Math.random().toString(36).substr(2, 9),
      data: newHoliday.data,
      descricao: newHoliday.descricao
    };
    const updatedFeriados = [...(localConfig.feriados || []), holiday];
    setLocalConfig({ ...localConfig, feriados: updatedFeriados });
    setNewHoliday({ data: '', descricao: '' });
    alert("Feriado adicionado à lista local! Clique em SALVAR no final da página para confirmar.");
  };

  const handleRemoveHoliday = (id: string) => {
    const updatedFeriados = (localConfig.feriados || []).filter(h => h.id !== id);
    setLocalConfig({ ...localConfig, feriados: updatedFeriados });
    alert("Feriado removido da lista local! Clique em SALVAR no final da página para confirmar.");
  };

  const handleChangePassword = () => {
    const user = users.find(u => u.usuario === changePass.usuario);
    if (!user) return alert("Usuário não encontrado.");
    if (user.senha !== changePass.senhaAtual) return alert("Senha atual incorreta.");
    
    const updatedUsers = users.map(u => {
      if (u.usuario === changePass.usuario) {
        return { ...u, senha: changePass.novaSenha };
      }
      return u;
    });
    setUsers(updatedUsers);
    setChangePass({ usuario: 'Admin', senhaAtual: '', novaSenha: '' });
    alert("Senha alterada com sucesso!");
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-black text-text tracking-tighter">Configuração</h1>
        
        {/* Tabs Header */}
        <div className="flex bg-surface border border-border p-1 rounded-md w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-primary text-white" 
                  : "text-secondary hover:text-text hover:bg-bg"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-geometric p-8 bg-surface space-y-10 min-h-[500px] flex flex-col relative">
        <div className="flex-1">
          {activeTab === 'geral' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest block">Primeiro dia da escala:</label>
                  <select 
                    value={localConfig.primeiroDia}
                    onChange={(e) => setLocalConfig({ ...localConfig, primeiroDia: parseInt(e.target.value) })}
                    className="w-full bg-bg border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-bold text-sm"
                  >
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest block">Imagem ao lado do título:</label>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-xs text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-bg file:text-text hover:file:bg-border transition-all w-full border border-border p-1 rounded-md" 
                    />
                    <p className="text-[9px] text-secondary font-medium">Escolha uma imagem para aparecer na barra lateral.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-secondary uppercase tracking-widest block">Largura da imagem (px):</label>
                    <input 
                      type="number" 
                      value={localConfig.logoWidth}
                      onChange={(e) => setLocalConfig({ ...localConfig, logoWidth: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-bold text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-secondary uppercase tracking-widest block">Altura da imagem (px):</label>
                    <input 
                      type="number" 
                      value={localConfig.logoHeight}
                      onChange={(e) => setLocalConfig({ ...localConfig, logoHeight: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-bold text-sm" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-widest block">Backup dos Funcionários:</label>
                <div className="flex flex-wrap items-center gap-4">
                  <button 
                    onClick={handleBackup}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md text-xs transition-colors flex items-center gap-2"
                  >
                    <Download className="w-3 h-3" /> Fazer Backup
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={handleRestore}
                      className="text-xs text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-bg file:text-text hover:file:bg-border transition-all w-full border border-border p-1 rounded-md" 
                    />
                  </div>
                </div>
                <p className="text-[10px] text-secondary font-medium">Faça download do backup ou selecione um arquivo para restaurar.</p>
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest">Gerenciamento de Usuários</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Usuário</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map(u => (
                        <tr key={u.usuario}>
                          <td className="px-6 py-4 text-xs font-bold text-text">{u.usuario}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleRemoveUser(u.usuario)}
                              className="bg-red-400 hover:bg-red-500 text-white text-[10px] font-bold py-1 px-4 rounded transition-colors uppercase"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Novo Usuário:</label>
                      <input 
                        type="text" 
                        value={newUser.usuario}
                        onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
                        className="w-full bg-bg border border-border rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Nova Senha:</label>
                      <input 
                        type="password" 
                        value={newUser.senha}
                        onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })}
                        placeholder="••••••••" 
                        className="w-full bg-bg border border-border rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" 
                      />
                    </div>
                  </div>
                  <button onClick={handleAddUser} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-md text-xs transition-colors">Adicionar Usuário</button>
                </div>

                <div className="space-y-4 md:border-l md:border-border md:pl-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Senha Atual:</label>
                      <input 
                        type="password" 
                        value={changePass.senhaAtual}
                        onChange={(e) => setChangePass({...changePass, senhaAtual: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full bg-bg border border-border rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Nova Senha:</label>
                      <input 
                        type="password" 
                        value={changePass.novaSenha}
                        onChange={(e) => setChangePass({...changePass, novaSenha: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full bg-bg border border-border rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" 
                      />
                    </div>
                  </div>
                  <button onClick={handleChangePassword} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md text-xs transition-colors">Alterar Senha</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissoes' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
              <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest">Permissões de Usuários</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4 text-center">Adicionar Usuários</th>
                      <th className="px-6 py-4 text-center">Adicionar Funcionários</th>
                      <th className="px-6 py-4 text-center">Editar Funcionários</th>
                      <th className="px-6 py-4 text-center">Excluir Funcionários</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {userPermissions.map(p => (
                      <tr key={p.usuario}>
                        <td className="px-6 py-4 text-xs font-bold text-text">{p.usuario}</td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={p.adicionarUsuarios} 
                            onChange={() => handleTogglePermission(p.usuario, 'adicionarUsuarios')}
                            className="w-4 h-4 accent-primary" 
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={p.adicionarFuncionarios} 
                            onChange={() => handleTogglePermission(p.usuario, 'adicionarFuncionarios')}
                            className="w-4 h-4 accent-primary" 
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={p.editarFuncionarios} 
                            onChange={() => handleTogglePermission(p.usuario, 'editarFuncionarios')}
                            className="w-4 h-4 accent-primary" 
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={p.excluirFuncionarios} 
                            onChange={() => handleTogglePermission(p.usuario, 'excluirFuncionarios')}
                            className="w-4 h-4 accent-primary" 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-secondary font-medium">Marque as caixas para conceder permissões aos usuários.</p>
            </div>
          )}

          {activeTab === 'feriados' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
              <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest">Cadastro de Feriados</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Data do Feriado:</label>
                      <input 
                        type="date" 
                        value={newHoliday.data}
                        onChange={(e) => setNewHoliday({ ...newHoliday, data: e.target.value })}
                        className="w-full bg-bg border border-border rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Descrição:</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Natal, Ano Novo..."
                        value={newHoliday.descricao}
                        onChange={(e) => setNewHoliday({ ...newHoliday, descricao: e.target.value })}
                        className="w-full bg-bg border border-border rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" 
                      />
                    </div>
                  </div>
                  <button onClick={handleAddHoliday} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-md text-xs transition-colors">Adicionar Feriado</button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Feriado</th>
                        <th className="px-6 py-4 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(localConfig.feriados || []).map(h => (
                        <tr key={h.id}>
                          <td className="px-6 py-4 text-xs font-bold text-text">{formatDisplayDate(h.data)}</td>
                          <td className="px-6 py-4 text-xs text-secondary font-medium">{h.descricao}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleRemoveHoliday(h.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contato' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
              <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest">Contato</h3>
              <div className="space-y-4">
                <p className="text-xs text-text leading-relaxed font-bold">
                  Para dúvidas sobre o sistema ou doação para manter o projeto, entre em contato:
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-secondary uppercase tracking-tighter">
                    Email: <a href="mailto:geanmcarvalho@live.com" className="text-primary hover:underline lowercase font-medium">geanmcarvalho@live.com</a>
                  </p>
                  <p className="text-xs font-bold text-secondary uppercase tracking-tighter">
                    WhatsApp: <a href="https://wa.me/5515981495869" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">+55 15 98149-5869</a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="pt-8 border-t border-border flex justify-end gap-3 mt-auto">
          <button onClick={handleSaveAll} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-8 rounded-md text-xs transition-colors">Salvar</button>
        </div>
      </div>
    </div>
  );
}
