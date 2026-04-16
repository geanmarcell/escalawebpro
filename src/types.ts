export type Shift = 'Manhã' | 'Tarde' | 'Noite';

export type ScaleType = '6x1' | '12x36' | '5x2' | '4x2' | '4x3' | '12x24' | '6x2' | '24x72' | '3x3' | '2x2' | '5x1';

export interface Employee {
  id: number;
  cracha: string;
  nome: string;
  funcao: string;
  setor: string;
  admissao: string;
  folgaSemanal: string;
  folgaDomingo: string;
  turno: Shift;
  ferias: string | null;
  diasFerias: number;
  nascimento: string | null;
  horaEntrada: string;
  horaSaida: string;
  tipoEscala: ScaleType | '';
  licencaInicio: string | null;
  licencaFim: string | null;
}

export interface User {
  usuario: string;
  senha?: string;
}

export interface UserPermission {
  usuario: string;
  adicionarUsuarios: boolean;
  adicionarFuncionarios: boolean;
  editarFuncionarios: boolean;
  excluirFuncionarios: boolean;
}

export interface AppConfig {
  primeiroDia: number;
  logoImg: string | null;
  logoWidth: number;
  logoHeight: number;
}
