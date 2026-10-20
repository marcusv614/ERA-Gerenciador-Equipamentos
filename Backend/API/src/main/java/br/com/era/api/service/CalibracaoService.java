package br.com.era.api.service;

import br.com.era.api.dto.*;
import br.com.era.api.exception.*;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Set;

@Service
public class CalibracaoService {
    private final EquipamentoRepository equipamentos;
    private final EquipamentoService equipamentoService;
    private final UsuarioService usuarios;
    private final MovimentacaoRepository movimentacoes;
    private final InventarioHistoricoService inventario;
    public CalibracaoService(EquipamentoRepository equipamentos,EquipamentoService equipamentoService,UsuarioService usuarios,MovimentacaoRepository movimentacoes,InventarioHistoricoService inventario){this.equipamentos=equipamentos;this.equipamentoService=equipamentoService;this.usuarios=usuarios;this.movimentacoes=movimentacoes;this.inventario=inventario;}
    private Usuario autor(String login,boolean operacao){Usuario u=usuarios.buscarPorLogin(login);if(!(operacao?Set.of(PerfilUsuario.ADMIN,PerfilUsuario.ESTOQUE):Set.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.ESTOQUE)).contains(u.getPerfil()))throw new AccessDeniedException("Esta etapa da calibração deve ser registrada pelo estoque ou administrador.");return u;}
    private Equipamento buscar(Long id){return equipamentos.buscarParaAtualizacao(id).orElseThrow(()->new RecursoNaoEncontradoException("Equipamento não encontrado."));}
    private void elegivel(Equipamento e){
        if(e.isArquivado())throw new RegraNegocioException("Restaure o equipamento antes de registrar calibração.");
        if(!e.isFluke())throw new RegraNegocioException("O controle de calibração está disponível para equipamentos Fluke.");
        if(e.getQuantidade()!=1)throw new RegraNegocioException("A calibração é individual por número de série. Cadastre cada Fluke separadamente.");
    }
    private CalibracaoEquipamento registro(Equipamento e,Long id){return e.getCalibracoes().stream().filter(c->Objects.equals(c.getId(),id)).findFirst().orElseThrow(()->new RecursoNaoEncontradoException("Calibração não encontrada para este equipamento."));}
    private void fase(CalibracaoEquipamento c,String status){if(!status.equals(c.getStatus()))throw new RegraNegocioException("A calibração não está na etapa necessária para esta operação. Atualize os dados.");}
    private void passada(LocalDate data,String campo){if(data==null||data.isAfter(LocalDate.now()))throw new RegraNegocioException("Informe "+campo+" até a data de hoje.");}
    private void certificado(LocalDate data,LocalDate validade){passada(data,"a data da calibração");if(validade==null||validade.isBefore(data))throw new RegraNegocioException("A validade do certificado não pode ser anterior à data da calibração.");}
    private EquipamentoDto.Resposta salvar(Equipamento e){equipamentos.saveAndFlush(e);return equipamentoService.respostaOperacional(e);}
    @Transactional public EquipamentoDto.Resposta solicitar(Long id,CalibracaoDto.Solicitacao dados,String login){
        Usuario u=autor(login,false);Equipamento e=buscar(id);elegivel(e);
        if(e.getQuantidadeCalibracao()>0)throw new RegraNegocioException("Já existe uma calibração em atendimento para este equipamento.");
        if(e.getQuantidadeDisponivel()!=1||!Set.of("Em campo","Em estoque").contains(e.getStatus()))throw new RegraNegocioException("Conclua as reservas, movimentações e manutenções antes de solicitar calibração.");
        e.getCalibracoes().add(new CalibracaoEquipamento(e,opcional(dados.laboratorio()),opcional(dados.observacao()),u,false));
        return salvar(e);
    }
    @Transactional public EquipamentoDto.Resposta retirar(Long id,Long calibracaoId,CalibracaoDto.Retirada dados,String login){
        Usuario u=autor(login,true);Equipamento e=buscar(id);CalibracaoEquipamento c=registro(e,calibracaoId);fase(c,"AGUARDANDO_RETIRADA");
        passada(dados.dataRetirada(),"a data da retirada");if(dados.dataRetirada().isBefore(c.getCriadoEm().toLocalDate()))throw new RegraNegocioException("A retirada não pode ser anterior à solicitação da calibração.");
        Obra origem=e.getObra();if(origem==null||!Objects.equals(origem.getId(),c.getObraOrigem().getId()))throw new RegraNegocioException("A localização atual não corresponde à obra da retirada.");
        movimentacoes.save(equipamentoService.novaMovimentacao(e,null,origem,null,e.getTecnico(),"Em estoque",1,dados.dataRetirada()));
        c.retirar(dados.dataRetirada(),u);equipamentoService.aplicarDestino(e,null,null,"Em estoque",dados.dataRetirada());
        equipamentos.flush();inventario.registrar(origem);return salvar(e);
    }
    @Transactional public EquipamentoDto.Resposta enviar(Long id,Long calibracaoId,CalibracaoDto.Envio dados,String login){
        Usuario u=autor(login,true);Equipamento e=buscar(id);CalibracaoEquipamento c=registro(e,calibracaoId);fase(c,"AGUARDANDO_ENVIO");
        if(e.getObra()!=null)throw new RegraNegocioException("Confirme a retirada da obra antes de enviar ao laboratório.");
        passada(dados.dataEnvio(),"a data de envio");LocalDate inicio=c.getDataRetirada()==null?c.getCriadoEm().toLocalDate():c.getDataRetirada();
        if(dados.dataEnvio().isBefore(inicio))throw new RegraNegocioException("O envio não pode ser anterior à retirada ou à solicitação.");
        if(dados.previsaoRetorno()!=null&&dados.previsaoRetorno().isBefore(dados.dataEnvio()))throw new RegraNegocioException("A previsão de retorno não pode ser anterior ao envio.");
        c.enviar(dados.laboratorio().trim(),dados.dataEnvio(),dados.previsaoRetorno(),u);return salvar(e);
    }
    @Transactional public EquipamentoDto.Resposta retornar(Long id,Long calibracaoId,CalibracaoDto.Retorno dados,String login){
        Usuario u=autor(login,true);Equipamento e=buscar(id);CalibracaoEquipamento c=registro(e,calibracaoId);fase(c,"EM_CALIBRACAO");
        passada(dados.dataRetorno(),"a data do retorno");certificado(dados.dataCalibracao(),dados.validade());
        if(dados.dataRetorno().isBefore(c.getDataEnvio())||dados.dataCalibracao().isBefore(c.getDataEnvio())||dados.dataCalibracao().isAfter(dados.dataRetorno()))throw new RegraNegocioException("A calibração deve ocorrer entre o envio e o retorno do laboratório.");
        c.certificado(c.getLaboratorio(),dados.certificado().trim(),dados.dataCalibracao(),dados.validade());c.retornar(dados.dataRetorno(),opcional(dados.observacao()),u);
        e.setStatus("Em estoque");e.setDataEntrada(dados.dataRetorno());return salvar(e);
    }
    @Transactional public EquipamentoDto.Resposta registrarCertificado(Long id,CalibracaoDto.Certificado dados,String login){
        Usuario u=autor(login,false);Equipamento e=buscar(id);elegivel(e);certificado(dados.dataCalibracao(),dados.validade());
        if(e.getQuantidadeCalibracao()>0)throw new RegraNegocioException("Conclua o atendimento em andamento antes de registrar um certificado anterior.");
        CalibracaoEquipamento c=new CalibracaoEquipamento(e,dados.laboratorio().trim(),opcional(dados.observacao()),u,true);
        c.certificado(dados.laboratorio().trim(),dados.certificado().trim(),dados.dataCalibracao(),dados.validade());e.getCalibracoes().add(c);return salvar(e);
    }
    @Transactional public EquipamentoDto.Resposta cancelar(Long id,Long calibracaoId,CalibracaoDto.Cancelamento dados,String login){
        Usuario u=autor(login,false);Equipamento e=buscar(id);CalibracaoEquipamento c=registro(e,calibracaoId);
        if(!Set.of("AGUARDANDO_RETIRADA","AGUARDANDO_ENVIO").contains(c.getStatus()))throw new RegraNegocioException("Somente atendimentos ainda não enviados ao laboratório podem ser cancelados.");
        c.cancelar(dados.motivo().trim(),u);return salvar(e);
    }
    private String opcional(String texto){return texto==null||texto.isBlank()?null:texto.trim();}
}
