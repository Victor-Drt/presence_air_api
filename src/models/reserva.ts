import { Model, DataTypes } from 'sequelize';

import sequelize from "../config/database";

// Definindo a interface Reserva que herda de Model
export class Reserva extends Model {
  public usuarioAtividade!: string;  // Usuário / Atividade que fez a reserva
  public area!: string;  // Área onde a sala está localizada
  public sala!: string;  // Nome da sala
  public inicio!: string;  // Data e hora de início da reserva
  public fim!: string;  // Data e hora de fim da reserva
  public duracao!: number;  // Duração da reserva em horas decimais
  public descricao!: string | null;  // Descrição adicional (pode ser nulo)
  public tipo!: string;  // Tipo de atividade
  public reservadoPor!: string;  // Quem fez a reserva
  public ultimaAtualizacao!: string;  // Última atualização da reserva
  public statusArcondicionado!: boolean;  // Última atualização da reserva
}

// Definindo a tabela e os atributos no Sequelize
Reserva.init(
  {
    usuarioAtividade: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    area: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sala: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    inicio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fim: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    duracao: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reservadoPor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ultimaAtualizacao: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    statusArcondicionado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,  // Passa a instância do Sequelize
    tableName: 'reservas',  // Nome da tabela no banco de dados
    modelName: 'Reserva',  // Nome do modelo
    timestamps: false,  // Se você quiser usar timestamps, defina como true e adicione as colunas createdAt e updatedAt

    indexes: [
      {
        unique: true,  // Define o índice como único
        fields: ['area', 'sala', 'inicio', 'fim'],  // Campos que fazem parte do índice
      },
    ],

  }
);

