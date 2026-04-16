import React, { useState, useEffect } from 'react';
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
  User as UserIcon,
  Briefcase,
  Layers,
  Cake,
  PlaneTakeoff,
  Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Employee, User, UserPermission, AppConfig } from './types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isSunday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Views
type View = 'gerenciar' | 'escala' | 'escalaSemanal' | 'configuracao';

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
    logoHeight: 150
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
          <div className="font-extrabold text-xl text-primary tracking-tighter uppercase">Code_Analyst</div>
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
              {activeView === 'escalaSemanal' && <EscalaSemanalView employees={employees} />}
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

function GerenciarView({ employees, setEmployees }: { employees: Employee[], setEmployees: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = employees.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.cracha.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.setor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="section-label mb-1">Módulo de Ativos</h3>
          <h1 className="text-3xl font-black text-text tracking-tighter">Equipe de Trabalho</h1>
        </div>
        <button className="btn-primary">
          <Plus className="w-5 h-5" />
          <span>Cadastrar Novo</span>
        </button>
      </div>

      <div className="card-geometric bg-surface p-8">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-3.5 text-secondary w-5 h-5" />
          <input 
            type="text" 
            placeholder="Filtrar por nome, crachá ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg border border-border rounded-md py-3 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg">
                <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] border-y border-border">Crachá</th>
                <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] border-y border-border">Nome Completo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] border-y border-border">Responsabilidade</th>
                <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] border-y border-border">Setor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] border-y border-border">Configuração</th>
                <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] border-y border-border">Score</th>
                <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] border-y border-border text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length > 0 ? filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5 text-sm font-mono text-secondary font-bold">{emp.cracha}</td>
                  <td className="px-6 py-5 text-sm font-bold text-text">{emp.nome}</td>
                  <td className="px-6 py-5 text-sm text-secondary font-medium uppercase tracking-tighter">
                    {emp.funcao}
                  </td>
                  <td className="px-6 py-5 text-sm text-secondary">
                    <span className="font-bold border-b-2 border-primary/20">{emp.setor}</span>
                  </td>
                  <td className="px-6 py-5 text-sm text-secondary font-bold">
                    {emp.tipoEscala}
                  </td>
                  <td className="px-6 py-5 text-sm">
                    <div className="status-badge px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] uppercase">Excelente</div>
                  </td>
                  <td className="px-6 py-5 text-sm text-right">
                    <button className="text-primary font-bold text-xs uppercase hover:underline">Auditar</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-secondary italic text-sm">
                    Filtro vazio. Nenhum colaborador indexado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EscalaMensalView({ employees, config }: { employees: Employee[], config: AppConfig }) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="section-label mb-1">Mapeamento de Turnos</h3>
          <h1 className="text-3xl font-black text-text tracking-tighter">Plano Mensal</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-surface p-1 border border-border rounded-md">
          <button className="p-2 hover:bg-bg rounded transition-all active:scale-95">
            <ChevronLeft className="w-4 h-4 text-secondary" />
          </button>
          <span className="font-bold text-xs uppercase tracking-widest text-text px-4">Maio 2025</span>
          <button className="p-2 hover:bg-bg rounded transition-all active:scale-95">
            <ChevronRight className="w-4 h-4 text-secondary" />
          </button>
        </div>
      </div>
      
      <div className="card-geometric p-0 overflow-hidden">
        <div className="bg-bg p-5 border-b border-border flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          {['Geral', 'Limpeza', 'Segurança', 'Manutenção', 'Recepção'].map(cat => (
            <button key={cat} className={cn(
              "px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
              cat === 'Geral' ? "bg-primary text-white" : "bg-surface text-secondary border border-border hover:bg-slate-50"
            )}>
              {cat}
            </button>
          ))}
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[1200px] p-8">
            {/* Legend */}
            <div className="flex items-center gap-6 mb-10 px-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-accent/20 border-l-4 border-accent"></div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">F - Folga Garantida</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-warning/20 border-l-4 border-warning"></div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">D - Alerta Domingo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-primary/20 border-l-4 border-primary"></div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">H - Feriado Nacional</span>
              </div>
            </div>
            
            {/* Scale Grid */}
            <div className="relative border border-border rounded-lg overflow-hidden bg-surface shadow-2xl shadow-slate-200/50">
              <div className="grid grid-cols-[240px_repeat(31,1fr)] bg-bg border-b border-border">
                <div className="p-6 font-bold text-[10px] text-secondary uppercase tracking-widest border-r border-border">ID Colaborador / Data Log</div>
                {Array.from({length: 31}).map((_, i) => {
                  const day = ((config.primeiroDia + i - 1) % 31) + 1;
                  return (
                    <div key={i} className="py-5 text-center border-r border-border last:border-0 font-mono text-[10px] font-bold text-secondary">
                      {day.toString().padStart(2, '0')}
                    </div>
                  );
                })}
              </div>
              
              <div className="divide-y divide-border">
                {employees.length > 0 ? employees.map((e, idx) => (
                   <div key={e.id} className="grid grid-cols-[240px_repeat(31,1fr)] group hover:bg-slate-50 transition-colors">
                    <div className="p-5 border-r border-border flex flex-col justify-center">
                      <span className="font-bold text-sm text-text">{e.nome}</span>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter">{e.funcao}</span>
                    </div>
                    {Array.from({length: 31}).map((_, i) => {
                      const isOff = (i + idx + config.primeiroDia) % 7 === 0;
                      return (
                        <div key={i} className={cn(
                          "py-5 border-r border-border last:border-0 flex items-center justify-center transition-all",
                          isOff 
                            ? "bg-accent/10 border-l-2 border-accent text-accent font-black text-[10px]" 
                            : "text-border font-light"
                        )}>
                          {isOff ? 'F' : '•'}
                        </div>
                      )
                    })}
                  </div>
                )) : (
                  <div className="p-24 text-center flex flex-col items-center gap-4">
                    <Calendar className="w-16 h-16 text-border" />
                    <p className="text-secondary text-sm font-bold uppercase tracking-widest italic leading-loose">Aguardando indexação operacional...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EscalaSemanalView({ employees }: { employees: Employee[] }) {
  const weekDays = [
    { name: 'Segunda', id: 'seg' },
    { name: 'Terça', id: 'ter' },
    { name: 'Quarta', id: 'qua' },
    { name: 'Quinta', id: 'qui' },
    { name: 'Sexta', id: 'sex' },
    { name: 'Sábado', id: 'sab' },
    { name: 'Domingo', id: 'dom' }
  ];
  
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-label mb-1">Status Operacional</h3>
          <h1 className="text-3xl font-black text-text tracking-tighter">Janela Semanal</h1>
        </div>
        <div className="flex bg-surface border border-border p-1 rounded-md">
          <button className="px-6 py-2 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-widest">Ativo</button>
          <button className="px-6 py-2 rounded text-secondary hover:text-text text-[10px] font-bold uppercase tracking-widest transition-all">Próximo</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl">
        {weekDays.map((day, idx) => (
          <div key={day.id} className="bg-surface flex flex-col min-h-[500px]">
            <div className={cn(
              "p-6 border-b border-border flex flex-col items-center justify-center gap-1",
              day.id === 'dom' ? "bg-warning/5" : "bg-bg/50"
            )}>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">{day.name}</span>
              <span className={cn(
                "text-2xl font-black tabular-nums",
                day.id === 'dom' ? "text-warning" : "text-text"
              )}>{idx + 12}</span>
            </div>
            
            <div className="flex-1 p-5 space-y-4">
              {employees.slice(0, 3).map(e => (
                <div key={e.id} className="metric-card bg-surface hover:border-primary transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black text-primary border border-primary/20 px-2 py-0.5 rounded uppercase tracking-tighter">{e.turno}</span>
                    <span className="text-[9px] font-mono font-bold text-secondary">{e.horaEntrada}</span>
                  </div>
                  <p className="text-xs font-black text-text truncate">{e.nome}</p>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                     <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-accent"></div>
                        <div className="w-1 h-1 rounded-full bg-accent"></div>
                     </div>
                     <ChevronRight className="w-3 h-3 text-border" />
                  </div>
                </div>
              ))}
              
              {day.id === 'dom' && (
                <div className="bg-warning/10 border-l-4 border-warning p-4 rounded-sm">
                  <p className="text-[9px] font-bold text-warning uppercase tracking-widest mb-1">Folgas Pendentes</p>
                  <p className="text-[10px] font-bold text-text">Carlos S., Maria O.</p>
                </div>
              )}
            </div>
          </div>
        ))}
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
  const [changePass, setChangePass] = useState({ usuario: 'Admin', senhaAtual: '', novaSenha: '' });

  const tabs = [
    { id: 'geral', label: 'Geral' },
    { id: 'usuarios', label: 'Usuários' },
    { id: 'permissoes', label: 'Permissões' },
    { id: 'contato', label: 'Contato' },
  ];

  const handleSaveAll = () => {
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
    const updated = userPermissions.map(p => {
      if (p.usuario === usuario) {
        return { ...p, [field]: !p[field] };
      }
      return p;
    });
    setUserPermissions(updated);
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
                  <button onClick={handleSaveAll} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-md text-xs transition-colors">Salvar</button>
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
                      <input type="password" placeholder="••••••••" className="w-full bg-bg border border-border rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Nova Senha:</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-bg border border-border rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md text-xs transition-colors">Alterar Senha</button>
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
          <button onClick={() => setLocalConfig(config)} className="bg-slate-500 hover:bg-slate-600 text-white font-bold py-2.5 px-8 rounded-md text-xs transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
