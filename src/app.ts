import express from 'express';
import bodyParser from 'body-parser';
import reservaRoutes from './routes/reservaRoutes';
import sequelize from './config/database';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { Reserva } from './models/reserva';

const cors = require('cors');
const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware para parsear o corpo da requisição
app.use(bodyParser.json());
app.use(cors()); // Agora o CORS está configurado corretamente

// Usar as rotas de reserva
app.use('/api', reservaRoutes);

// Função para limpar chaves com aspas extras
const limparChaves = (obj: any) => {
  const novoObj: any = {};
  for (const chave in obj) {
    if (obj.hasOwnProperty(chave)) {
      const chaveLimpa = chave.replace(/^"|"$/g, '').trim(); // Remove aspas duplas e espaços extras
      novoObj[chaveLimpa] = obj[chave];
    }
  }
  return novoObj;
};

// Rota para upload e processamento do CSV
app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).send('Nenhum arquivo enviado.');
    return;
  }

  const filePath = path.join(__dirname, '..', req.file.path);
  const resultados: any[] = [];

  // Ler o arquivo CSV
  fs.createReadStream(filePath, { encoding: 'utf16le' })
    .pipe(csvParser({ separator: ',' }))
    .on('data', (row) => {
      const rowLimpo = limparChaves(row);
      resultados.push(rowLimpo);
    })
    .on('end', async () => {
      try {
        let inseridos = 0;
        let duplicados = 0;

        // Iterar sobre os resultados e adicionar ao banco apenas se não existir
        for (const reservaData of resultados) {
          const inicio = formatarData(reservaData['Início']?.trim());
          const fim = formatarData(reservaData['Fim']?.trim());
          const ultimaAtualizacao = formatarData(reservaData['Última Atualização']?.trim());
          const duracao = converterDuracao(reservaData['Duração']?.trim());
          const area = reservaData['Área']?.trim() || 'N/A';
          const sala = reservaData['Sala']?.trim() || 'N/A';

          // Verificar se a reserva já existe no banco
          const reservaExistente = await Reserva.findOne({
            where: {
              area,
              sala,
              inicio,
              fim,
            },
          });

          // Se não existir, cria a nova reserva
          if (!reservaExistente) {
            await Reserva.create({
              usuarioAtividade: reservaData['"Usuário / Atividade']?.trim() || 'N/A',
              area,
              sala,
              inicio: inicio || 'N/A',
              fim: fim || 'N/A',
              duracao: duracao,
              descricao: reservaData['Descrição']?.trim() || '',
              tipo: reservaData['Tipo']?.trim() || 'N/A',
              reservadoPor: reservaData['Reservado por']?.trim() || 'N/A',
              statusArcondicionado: false,
              ultimaAtualizacao: ultimaAtualizacao || 'N/A',
            });
            inseridos++;
          } else {
            duplicados++;
          }
        }

        // Apagar o arquivo após o processamento
        fs.unlinkSync(filePath);

        // Responder com o status da operação
        res.status(200).send(
          `Arquivo CSV processado com sucesso. Reservas inseridas: ${inseridos}, Reservas duplicadas ignoradas: ${duplicados}`
        );
      } catch (error) {
        console.error('Erro ao salvar reservas:', error);
        res.status(500).send('Erro ao processar o arquivo CSV');
      }
    });
});


function converterDuracao(duracao: string): number {
  const duracaoLimpa = duracao.replace(' horas', '').replace(',', '.');
  const duracaoNumero = parseFloat(duracaoLimpa);

  return isNaN(duracaoNumero) ? 0 : duracaoNumero;
}

function formatarData(dataString: string): String | null {
  try {
    // Remover o dia da semana (exemplo: "- segunda", "- terça")
    const dataSemDiaSemana = dataString.replace(/ - [a-zA-ZÀ-ú]+ /i, ' ');

    // Quebra a string em horário e data
    const [horario, diaTexto, mesTexto, ano] = dataSemDiaSemana.split(' ');

    if (!horario || !diaTexto || !mesTexto || !ano) {
      console.error('Formato de data inválido:', dataString);
      return null;
    }

    // Mapeamento de meses
    const meses: { [key: string]: string } = {
      janeiro: '01',
      fevereiro: '02',
      março: '03',
      abril: '04',
      maio: '05',
      junho: '06',
      julho: '07',
      agosto: '08',
      setembro: '09',
      outubro: '10',
      novembro: '11',
      dezembro: '12',
    };

    // Obter o número do mês
    const mes = meses[mesTexto.toLowerCase()];
    
    if (!mes) {
      console.error('Mês inválido:', mesTexto);
      return null;
    }

    // Construir a string de data no formato YYYY-MM-DDTHH:mm:ss
    const dataFormatada = `${ano}-${mes}-${diaTexto}T${horario}`;

    return new Date(dataFormatada).toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return null;
  }
}


// Sincronizar o banco de dados e iniciar o servidor
sequelize.sync().then(() => {
  console.log('Banco de dados sincronizado');
  app.listen(3000,'0.0.0.0', () => {
    console.log('Servidor rodando na porta 3000');
  });
});
