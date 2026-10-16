package br.com.era.api.controller;

import br.com.era.api.dto.CategoriaEquipamentoDto;
import br.com.era.api.service.CategoriaEquipamentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categorias-equipamento")
public class CategoriaEquipamentoController {
    private final CategoriaEquipamentoService service;

    public CategoriaEquipamentoController(CategoriaEquipamentoService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoriaEquipamentoDto.Resposta> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoriaEquipamentoDto.Resposta cadastrar(@Valid @RequestBody CategoriaEquipamentoDto.Requisicao dados) {
        return service.cadastrar(dados);
    }
}
