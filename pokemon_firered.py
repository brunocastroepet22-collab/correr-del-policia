"""
================================================================================
  POKÉMON ROJO FUEGO / VERDE HOJA - ENGINE 2D EN PYTHON TKINTER
================================================================================
Motor de videojuego retro inspirado en Pokémon Edición Rojo Fuego (GBA).
Desarrollado exclusivamente con la biblioteca estándar de Python (tkinter, random, time, math).

Controles:
  - Exploración: Teclas de flecha (Arriba, Abajo, Izquierda, Derecha) o W, A, S, D
  - Interacción / Confirmar: Z, Enter, Espacio o Clic Izquierdo en botones
  - Cancelar / Volver atrás: X, Escape o Retroceso
================================================================================
"""

import tkinter as tk
import random
import time
import math

# -----------------------------------------------------------------------------
# PALETA DE COLORES Y CONSTANTES RETRO GBA (ROJO FUEGO)
# -----------------------------------------------------------------------------
SCREEN_WIDTH = 640
SCREEN_HEIGHT = 480
TILE_SIZE = 40
GRID_COLS = SCREEN_WIDTH // TILE_SIZE  # 16 columnas
GRID_ROWS = 9                           # 9 filas para el mapa visible (360px)
MAP_HEIGHT = GRID_ROWS * TILE_SIZE      # 360px para el mapa, 120px para el HUD inferior

COLOR_BG_DARK       = "#181820"
COLOR_GRASS_LIGHT   = "#58B868"
COLOR_GRASS_DARK    = "#308838"
COLOR_TALL_GRASS    = "#206828"
COLOR_TALL_GRASS_TIP= "#78D878"
COLOR_PATH          = "#E0C890"
COLOR_PATH_BORDER   = "#B8A068"
COLOR_TREE_TRUNK    = "#804820"
COLOR_TREE_LEAVES   = "#186028"
COLOR_TREE_DARK     = "#084018"
COLOR_WATER         = "#4888E0"
COLOR_WATER_WAVE    = "#80B8F8"
COLOR_FLOWER_RED    = "#E84038"
COLOR_FLOWER_YELLOW = "#F8D030"

# Interfaz de Batalla Rojo Fuego
COLOR_BATTLE_BG_TOP = "#E8F8F0"
COLOR_BATTLE_BG_BOT = "#D0E8D8"
COLOR_BATTLE_BASE   = "#88C890"
COLOR_BATTLE_BOX    = "#F8F8F8"
COLOR_BATTLE_BORDER = "#505060"
COLOR_HP_GREEN      = "#48C058"
COLOR_HP_YELLOW     = "#F8B020"
COLOR_HP_RED        = "#E84038"
COLOR_HP_BG         = "#404040"

# Cuadro de texto y botones estilo Rojo Fuego
COLOR_TEXTBOX_BG    = "#283038"
COLOR_TEXTBOX_INNER = "#F8F8F8"
COLOR_TEXTBOX_BORDER= "#E84038"
COLOR_TEXT_DARK     = "#202028"
COLOR_BTN_FIGHT     = "#E04038"
COLOR_BTN_BAG       = "#E89020"
COLOR_BTN_POKEMON   = "#48A850"
COLOR_BTN_RUN       = "#4888D8"


# -----------------------------------------------------------------------------
# CLASE: Move (Movimientos de Combate)
# -----------------------------------------------------------------------------
class Move:
    """Representa un movimiento de Pokémon con su tipo, daño, PP y precisión."""
    def __init__(self, name, move_type, power, max_pp, accuracy=100):
        self.name = name
        self.move_type = move_type
        self.power = power
        self.max_pp = max_pp
        self.pp = max_pp
        self.accuracy = accuracy

    def can_use(self):
        return self.pp > 0

    def use(self):
        if self.can_use():
            self.pp -= 1
            return True
        return False


# -----------------------------------------------------------------------------
# CLASE: Pokemon
# -----------------------------------------------------------------------------
class Pokemon:
    """Representa a un Pokémon con estadísticas, movimientos y dibujo de sprite."""
    def __init__(self, name, level, max_hp, attack, defense, speed, poke_type, moves, sprite_id="charmander"):
        self.name = name
        self.level = level
        self.max_hp = max_hp
        self.hp = max_hp
        self.attack = attack
        self.defense = defense
        self.speed = speed
        self.poke_type = poke_type
        self.moves = moves
        self.sprite_id = sprite_id

    def is_fainted(self):
        return self.hp <= 0

    def take_damage(self, amount):
        self.hp = max(0, self.hp - amount)
        return self.hp

    def heal(self, amount):
        self.hp = min(self.max_hp, self.hp + amount)
        return self.hp

    def calculate_damage_against(self, move, target):
        """Cálculo simplificado de daño basado en la fórmula de Pokémon GBA."""
        if move.power == 0:
            return 0, 1.0, False

        # Multiplicador elemental básico
        type_chart = {
            ("FUEGO", "PLANTA"): 2.0,
            ("FUEGO", "AGUA"): 0.5,
            ("FUEGO", "FUEGO"): 0.5,
            ("AGUA", "FUEGO"): 2.0,
            ("AGUA", "PLANTA"): 0.5,
            ("AGUA", "AGUA"): 0.5,
            ("PLANTA", "AGUA"): 2.0,
            ("PLANTA", "FUEGO"): 0.5,
            ("PLANTA", "PLANTA"): 0.5,
            ("ELÉCTRICO", "AGUA"): 2.0,
            ("ELÉCTRICO", "PLANTA"): 0.5,
        }
        multiplier = type_chart.get((move.move_type, target.poke_type), 1.0)
        
        # Probabilidad de golpe crítico (6.25%)
        is_crit = random.random() < 0.0625
        crit_mult = 1.5 if is_crit else 1.0

        # Variación aleatoria (85% a 100%)
        random_factor = random.uniform(0.85, 1.0)

        # Fórmula base
        base = (((2 * self.level / 5 + 2) * move.power * (self.attack / max(1, target.defense))) / 50) + 2
        total_damage = int(base * multiplier * crit_mult * random_factor)
        total_damage = max(1, total_damage)

        return total_damage, multiplier, is_crit


# -----------------------------------------------------------------------------
# CLASE: Player
# -----------------------------------------------------------------------------
class Player:
    """Gestiona la posición del jugador en la cuadrícula, dirección e inventario."""
    def __init__(self, grid_x, grid_y):
        self.grid_x = grid_x
        self.grid_y = grid_y
        self.direction = "down"  # 'up', 'down', 'left', 'right'
        self.step_count = 0
        self.team = []
        self.bag = {
            "Poción": 3,
            "Poké Ball": 5,
            "Antídoto": 2
        }

    @property
    def lead_pokemon(self):
        for poke in self.team:
            if not poke.is_fainted():
                return poke
        return self.team[0] if self.team else None

    def move(self, dx, dy):
        self.grid_x += dx
        self.grid_y += dy
        self.step_count += 1
        if dx > 0:
            self.direction = "right"
        elif dx < 0:
            self.direction = "left"
        elif dy > 0:
            self.direction = "down"
        elif dy < 0:
            self.direction = "up"


# -----------------------------------------------------------------------------
# MAPA DEL JUEGO: MATRIZ Y TIPOS DE CASILLA
# -----------------------------------------------------------------------------
TILE_EMPTY = 0      # Camino caminable
TILE_GRASS = 1      # Césped normal caminable
TILE_TALL_GRASS = 2 # Hierba alta (con probabilidad de encuentros)
TILE_TREE = 3       # Árbol (sólido / obstáculo)
TILE_WATER = 4      # Agua (sólido)
TILE_FLOWER = 5     # Flor ornamental (caminable)
TILE_SIGN = 6       # Cartel de ruta (sólido)

MAP_LAYOUT = [
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 1, 1, 1, 3, 2, 2, 2, 2, 3, 1, 1, 1, 5, 1, 3],
    [3, 1, 6, 0, 0, 0, 2, 2, 2, 0, 0, 0, 1, 1, 1, 3],
    [3, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 3],
    [3, 2, 2, 1, 1, 1, 3, 3, 1, 1, 1, 1, 0, 0, 1, 3],
    [3, 2, 2, 2, 1, 1, 3, 3, 1, 2, 2, 2, 2, 0, 1, 3],
    [3, 1, 1, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 1, 3],
    [3, 1, 5, 0, 1, 1, 4, 4, 0, 0, 0, 0, 0, 0, 1, 3],
    [3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3],
]


# -----------------------------------------------------------------------------
# CLASE: BattleSystem (Sistema de Combate por Turnos)
# -----------------------------------------------------------------------------
class BattleSystem:
    """Controla el flujo, turnos, menús y mensajes del combate Pokémon."""
    STATE_INTRO = "intro"
    STATE_ACTION_MENU = "action_menu"
    STATE_MOVE_MENU = "move_menu"
    STATE_BAG_MENU = "bag_menu"
    STATE_POKEMON_MENU = "pokemon_menu"
    STATE_DIALOG = "dialog"
    STATE_FINISHED = "finished"

    def __init__(self, player_pokemon, wild_pokemon, on_battle_end_callback):
        self.player_poke = player_pokemon
        self.wild_poke = wild_pokemon
        self.on_battle_end = on_battle_end_callback

        self.state = self.STATE_INTRO
        self.selected_action = 0  # 0: Luchar, 1: Mochila, 2: Pokémon, 3: Huir
        self.selected_move = 0
        self.dialog_text = f"¡Un {self.wild_poke.name} salvaje apareció!"
        self.dialog_queue = []
        self.is_player_turn = True
        self.is_busy = False

    def next_dialog(self):
        """Avanza al siguiente mensaje en la cola o regresa al menú correspondiente."""
        if self.dialog_queue:
            self.dialog_text = self.dialog_queue.pop(0)
        else:
            if self.wild_poke.is_fainted():
                self.dialog_text = f"¡El {self.wild_poke.name} salvaje fue derrotado!"
                self.state = self.STATE_FINISHED
            elif self.player_poke.is_fainted():
                self.dialog_text = f"¡{self.player_poke.name} se desmayó!"
                self.state = self.STATE_FINISHED
            elif self.state == self.STATE_FINISHED:
                self.on_battle_end(victory=not self.player_poke.is_fainted())
            else:
                self.state = self.STATE_ACTION_MENU

    def choose_action(self, action_index, player):
        """Gestiona la selección de acción principal [0: Luchar, 1: Mochila, 2: Pokémon, 3: Huir]."""
        if action_index == 0:  # Luchar
            self.state = self.STATE_MOVE_MENU
            self.selected_move = 0
        elif action_index == 1:  # Mochila
            self.use_potion(player)
        elif action_index == 2:  # Pokémon
            self.show_team_status()
        elif action_index == 3:  # Huir
            self.attempt_escape()

    def select_move(self, move_index, player):
        """El jugador ejecuta un movimiento contra el Pokémon salvaje."""
        if move_index < 0 or move_index >= len(self.player_poke.moves):
            return

        move = self.player_poke.moves[move_index]
        if not move.can_use():
            self.dialog_text = f"¡No quedan PP para {move.name}!"
            self.state = self.STATE_DIALOG
            return

        move.use()
        self.state = self.STATE_DIALOG
        self.dialog_text = f"¡{self.player_poke.name} usó {move.name}!"

        # Precisión
        if random.randint(1, 100) > move.accuracy:
            self.dialog_queue.append(f"¡El ataque de {self.player_poke.name} falló!")
        else:
            damage, mult, crit = self.player_poke.calculate_damage_against(move, self.wild_poke)
            self.wild_poke.take_damage(damage)

            if crit:
                self.dialog_queue.append("¡Un golpe crítico!")
            if mult > 1.0:
                self.dialog_queue.append("¡Es muy eficaz!")
            elif mult < 1.0 and mult > 0:
                self.dialog_queue.append("No es muy eficaz...")

        # Verificar si el salvaje fue derrotado
        if self.wild_poke.is_fainted():
            self.dialog_queue.append(f"¡El {self.wild_poke.name} enemigo se debilitó!")
            self.dialog_queue.append(f"¡{self.player_poke.name} ganó 45 Puntos de Experiencia!")
            return

        # Turno del rival
        self.queue_rival_turn()

    def queue_rival_turn(self):
        """Calcula y encola el ataque del Pokémon rival."""
        valid_moves = [m for m in self.wild_poke.moves if m.can_use()]
        if not valid_moves:
            valid_moves = self.wild_poke.moves
        enemy_move = random.choice(valid_moves)
        enemy_move.use()

        self.dialog_queue.append(f"¡El {self.wild_poke.name} enemigo usó {enemy_move.name}!")
        if random.randint(1, 100) > enemy_move.accuracy:
            self.dialog_queue.append("¡Pero falló!")
        else:
            dmg, mult, crit = self.wild_poke.calculate_damage_against(enemy_move, self.player_poke)
            self.player_poke.take_damage(dmg)
            if crit:
                self.dialog_queue.append("¡Un golpe crítico del rival!")
            if mult > 1.0:
                self.dialog_queue.append("¡Es muy eficaz!")
            elif mult < 1.0 and mult > 0:
                self.dialog_queue.append("No es muy eficaz...")

        if self.player_poke.is_fainted():
            self.dialog_queue.append(f"¡{self.player_poke.name} se debilitó!")
            self.dialog_queue.append("¡No te quedan Pokémon con ganas de luchar!")

    def use_potion(self, player):
        """Usa una Poción del inventario del jugador para curar 20 PS."""
        potions = player.bag.get("Poción", 0)
        self.state = self.STATE_DIALOG
        if potions > 0:
            if self.player_poke.hp >= self.player_poke.max_hp:
                self.dialog_text = f"¡Los PS de {self.player_poke.name} ya están al máximo!"
            else:
                player.bag["Poción"] -= 1
                healed = 20
                old_hp = self.player_poke.hp
                self.player_poke.heal(healed)
                actual_healed = self.player_poke.hp - old_hp
                self.dialog_text = f"¡Usaste una Poción! {self.player_poke.name} recuperó {actual_healed} PS."
                # El rival aprovecha el turno para atacar
                self.queue_rival_turn()
        else:
            self.dialog_text = "¡No te quedan Pociones en la Mochila!"

    def show_team_status(self):
        """Muestra el estado actual del equipo Pokémon."""
        self.state = self.STATE_DIALOG
        self.dialog_text = f"Equipo: {self.player_poke.name} (Nv. {self.player_poke.level}) - {self.player_poke.hp}/{self.player_poke.max_hp} PS"

    def attempt_escape(self):
        """Calcula la probabilidad de escapar exitosamente del combate salvaje."""
        self.state = self.STATE_DIALOG
        # Fórmula clásica basada en velocidad relativa
        if self.player_poke.speed >= self.wild_poke.speed or random.random() < 0.8:
            self.dialog_text = "¡Escapaste sin problemas!"
            self.state = self.STATE_FINISHED
        else:
            self.dialog_text = "¡No pudiste escapar!"
            self.queue_rival_turn()


# -----------------------------------------------------------------------------
# CLASE: Game (Motor Principal y Renderizador Tkinter)
# -----------------------------------------------------------------------------
class Game:
    """Controlador principal de la ventana, entrada por teclado/ratón y renderizado Canvas."""
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Pokémon Rojo Fuego / Verde Hoja - Python Edition")
        self.root.geometry(f"{SCREEN_WIDTH}x{SCREEN_HEIGHT}")
        self.root.resizable(False, False)
        self.root.configure(bg=COLOR_BG_DARK)

        # Canvas principal de dibujo
        self.canvas = tk.Canvas(
            self.root,
            width=SCREEN_WIDTH,
            height=SCREEN_HEIGHT,
            bg=COLOR_BG_DARK,
            highlightthickness=0
        )
        self.canvas.pack(fill="both", expand=True)

        # Inicialización de Entidades
        self.init_game_data()

        # Eventos de Teclado y Ratón
        self.root.bind("<KeyPress>", self.on_key_press)
        self.canvas.bind("<Button-1>", self.on_canvas_click)

        # Bucle de actualización gráfica
        self.running = True
        self.update_loop()

    def init_game_data(self):
        """Crea el mapa, el jugador y los Pokémon iniciales."""
        self.map_grid = MAP_LAYOUT
        self.player = Player(grid_x=3, grid_y=3)

        # Pokémon del jugador: Charmander
        ember = Move("Ascuas", "FUEGO", power=40, max_pp=25, accuracy=100)
        scratch = Move("Arañazo", "NORMAL", power=40, max_pp=35, accuracy=100)
        growl = Move("Gruñido", "NORMAL", power=0, max_pp=40, accuracy=100)
        metal_claw = Move("Garra Metal", "ACERO", power=50, max_pp=35, accuracy=95)

        self.player_starter = Pokemon(
            name="Charmander",
            level=5,
            max_hp=20,
            attack=12,
            defense=10,
            speed=13,
            poke_type="FUEGO",
            moves=[ember, scratch, growl, metal_claw],
            sprite_id="charmander"
        )
        self.player.team.append(self.player_starter)

        # Estado del juego: 'world', 'battle', 'transition'
        self.game_state = "world"
        self.battle = None
        self.notification_text = "Ruta 1 - Muévete con las FLECHAS hacia la hierba alta."
        self.step_in_grass = 0

    # -------------------------------------------------------------------------
    # GENERADOR DE POKÉMON SALVAJES
    # -------------------------------------------------------------------------
    def generate_wild_pokemon(self):
        """Crea un Pokémon salvaje aleatorio típico de las primeras rutas de Kanto."""
        species = [
            {
                "name": "Pidgey",
                "level": random.randint(2, 4),
                "type": "NORMAL",
                "hp": 16,
                "atk": 9,
                "def": 8,
                "spd": 11,
                "moves": [
                    Move("Placaje", "NORMAL", 35, 35),
                    Move("Ataque Arena", "TIERRA", 0, 15)
                ],
                "sprite": "pidgey"
            },
            {
                "name": "Rattata",
                "level": random.randint(2, 4),
                "type": "NORMAL",
                "hp": 15,
                "atk": 11,
                "def": 7,
                "spd": 14,
                "moves": [
                    Move("Placaje", "NORMAL", 35, 35),
                    Move("Látigo", "NORMAL", 0, 30)
                ],
                "sprite": "rattata"
            },
            {
                "name": "Oddish",
                "level": random.randint(3, 5),
                "type": "PLANTA",
                "hp": 18,
                "atk": 10,
                "def": 11,
                "spd": 7,
                "moves": [
                    Move("Absorber", "PLANTA", 20, 25),
                    Move("Ácido", "VENENO", 40, 30)
                ],
                "sprite": "oddish"
            },
            {
                "name": "Pikachu",
                "level": random.randint(3, 5),
                "type": "ELÉCTRICO",
                "hp": 18,
                "atk": 13,
                "def": 8,
                "spd": 16,
                "moves": [
                    Move("Impactrueno", "ELÉCTRICO", 40, 30),
                    Move("Ataque Rápido", "NORMAL", 40, 30)
                ],
                "sprite": "pikachu"
            }
        ]
        choice = random.choice(species)
        return Pokemon(
            name=choice["name"],
            level=choice["level"],
            max_hp=choice["hp"],
            attack=choice["atk"],
            defense=choice["def"],
            speed=choice["spd"],
            poke_type=choice["type"],
            moves=choice["moves"],
            sprite_id=choice["sprite"]
        )

    # -------------------------------------------------------------------------
    # GESTIÓN DE MOVIMIENTO Y ENCUENTROS SALVAJES
    # -------------------------------------------------------------------------
    def try_move_player(self, dx, dy):
        """Valida colisiones con árboles/bordes y detecta hierba alta."""
        if self.game_state != "world":
            return

        new_x = self.player.grid_x + dx
        new_y = self.player.grid_y + dy

        # Comprobar límites del mapa
        if new_x < 0 or new_x >= GRID_COLS or new_y < 0 or new_y >= GRID_ROWS:
            return

        target_tile = self.map_grid[new_y][new_x]

        # Comprobar colisiones sólidas
        if target_tile in (TILE_TREE, TILE_WATER, TILE_SIGN):
            self.player.move(dx, dy)  # Gira la dirección del personaje aunque no avance
            self.player.grid_x -= dx
            self.player.grid_y -= dy
            if target_tile == TILE_SIGN:
                self.notification_text = "Cartel: 'Ruta 1: Al Norte hacia Ciudad Verde'."
            return

        # Movimiento exitoso
        self.player.move(dx, dy)
        self.notification_text = f"Posición: ({self.player.grid_x}, {self.player.grid_y})"

        # Comprobación de Hierba Alta y Encuentros
        if target_tile == TILE_TALL_GRASS:
            self.step_in_grass += 1
            # Probabilidad aproximada de encuentro por paso en hierba: 25%
            if random.random() < 0.28:
                self.start_wild_battle()

    def start_wild_battle(self):
        """Inicia la transición y el combate contra un Pokémon salvaje."""
        self.game_state = "battle"
        wild = self.generate_wild_pokemon()
        self.battle = BattleSystem(
            player_pokemon=self.player.lead_pokemon,
            wild_pokemon=wild,
            on_battle_end_callback=self.end_battle
        )

    def end_battle(self, victory=True):
        """Finaliza el combate y restaura el estado de exploración del mapa."""
        self.game_state = "world"
        if victory:
            self.notification_text = "¡Saliste victorioso del combate! Sigue explorando la Ruta 1."
        else:
            self.notification_text = "Tus Pokémon están agotados. Se recuperaron 10 PS para continuar."
            self.player.lead_pokemon.heal(10)
        self.battle = None

    # -------------------------------------------------------------------------
    # CONTROL DE ENTRADA (TECLADO Y RATÓN)
    # -------------------------------------------------------------------------
    def on_key_press(self, event):
        key = event.keysym.lower()

        if self.game_state == "world":
            if key in ("up", "w"):
                self.try_move_player(0, -1)
            elif key in ("down", "s"):
                self.try_move_player(0, 1)
            elif key in ("left", "a"):
                self.try_move_player(-1, 0)
            elif key in ("right", "d"):
                self.try_move_player(1, 0)
            elif key in ("z", "return", "space"):
                # Curar en caso de emergencia
                if self.player.lead_pokemon.hp < self.player.lead_pokemon.max_hp:
                    self.player.lead_pokemon.heal(20)
                    self.notification_text = f"¡Usaste una poción! {self.player.lead_pokemon.name} curado."

        elif self.game_state == "battle":
            bs = self.battle
            if bs.state == BattleSystem.STATE_INTRO:
                if key in ("z", "return", "space"):
                    bs.state = BattleSystem.STATE_ACTION_MENU

            elif bs.state == BattleSystem.STATE_ACTION_MENU:
                if key in ("up", "w"):
                    if bs.selected_action >= 2:
                        bs.selected_action -= 2
                elif key in ("down", "s"):
                    if bs.selected_action <= 1:
                        bs.selected_action += 2
                elif key in ("left", "a"):
                    if bs.selected_action in (1, 3):
                        bs.selected_action -= 1
                elif key in ("right", "d"):
                    if bs.selected_action in (0, 2):
                        bs.selected_action += 1
                elif key in ("z", "return", "space"):
                    bs.choose_action(bs.selected_action, self.player)

            elif bs.state == BattleSystem.STATE_MOVE_MENU:
                max_m = len(bs.player_poke.moves) - 1
                if key in ("up", "w"):
                    if bs.selected_move >= 2:
                        bs.selected_move -= 2
                elif key in ("down", "s"):
                    if bs.selected_move + 2 <= max_m:
                        bs.selected_move += 2
                elif key in ("left", "a"):
                    if bs.selected_move % 2 == 1:
                        bs.selected_move -= 1
                elif key in ("right", "d"):
                    if bs.selected_move % 2 == 0 and bs.selected_move + 1 <= max_m:
                        bs.selected_move += 1
                elif key in ("x", "escape", "backspace"):
                    bs.state = BattleSystem.STATE_ACTION_MENU
                elif key in ("z", "return", "space"):
                    bs.select_move(bs.selected_move, self.player)

            elif bs.state in (BattleSystem.STATE_DIALOG, BattleSystem.STATE_FINISHED):
                if key in ("z", "return", "space"):
                    bs.next_dialog()

    def on_canvas_click(self, event):
        """Permite hacer clic con el ratón directamente en los botones de batalla."""
        if self.game_state != "battle" or not self.battle:
            return

        x, y = event.x, event.y
        bs = self.battle

        # Clic para avanzar texto en diálogo o intro
        if bs.state in (BattleSystem.STATE_INTRO, BattleSystem.STATE_DIALOG, BattleSystem.STATE_FINISHED):
            bs.next_dialog() if bs.state != BattleSystem.STATE_INTRO else setattr(bs, "state", BattleSystem.STATE_ACTION_MENU)
            return

        # Coordenadas de los 4 botones de acción principal (abajo a la derecha)
        # [Luchar] (360, 380, 480, 420)  |  [Mochila] (500, 380, 620, 420)
        # [Pokémon] (360, 430, 480, 470) |  [Huir] (500, 430, 620, 470)
        if bs.state == BattleSystem.STATE_ACTION_MENU:
            if 360 <= x <= 480 and 375 <= y <= 415:
                bs.choose_action(0, self.player)
            elif 500 <= x <= 620 and 375 <= y <= 415:
                bs.choose_action(1, self.player)
            elif 360 <= x <= 480 and 425 <= y <= 465:
                bs.choose_action(2, self.player)
            elif 500 <= x <= 620 and 425 <= y <= 465:
                bs.choose_action(3, self.player)

        elif bs.state == BattleSystem.STATE_MOVE_MENU:
            # 4 ranuras de movimientos en el cuadro inferior
            # M1: (30, 375, 230, 415)  | M2: (250, 375, 450, 415)
            # M3: (30, 425, 230, 465)  | M4: (250, 425, 450, 465)
            # Botón Volver / Cancelar: (480, 400, 610, 440)
            if 30 <= x <= 230 and 375 <= y <= 415:
                bs.select_move(0, self.player)
            elif 250 <= x <= 450 and 375 <= y <= 415:
                bs.select_move(1, self.player)
            elif 30 <= x <= 230 and 425 <= y <= 465:
                bs.select_move(2, self.player)
            elif 250 <= x <= 450 and 425 <= y <= 465:
                bs.select_move(3, self.player)
            elif 480 <= x <= 610 and 395 <= y <= 445:
                bs.state = BattleSystem.STATE_ACTION_MENU

    # -------------------------------------------------------------------------
    # RENDERIZADO DEL MUNDO Y MAPA
    # -------------------------------------------------------------------------
    def draw_world(self):
        """Dibuja el mapa de cuadrícula estilo GBA, el jugador y el HUD informativo."""
        self.canvas.delete("all")

        # 1. Dibujar Casillas de Terreno
        for row in range(GRID_ROWS):
            for col in range(GRID_COLS):
                tile = self.map_grid[row][col]
                x1 = col * TILE_SIZE
                y1 = row * TILE_SIZE
                x2 = x1 + TILE_SIZE
                y2 = y1 + TILE_SIZE

                if tile == TILE_EMPTY:
                    # Camino de tierra
                    self.canvas.create_rectangle(x1, y1, x2, y2, fill=COLOR_PATH, outline=COLOR_PATH_BORDER)
                    # Textura de piedritas
                    self.canvas.create_rectangle(x1+8, y1+12, x1+10, y1+14, fill=COLOR_PATH_BORDER, outline="")
                    self.canvas.create_rectangle(x1+24, y1+28, x1+27, y1+30, fill=COLOR_PATH_BORDER, outline="")

                elif tile == TILE_GRASS:
                    # Césped liso
                    self.canvas.create_rectangle(x1, y1, x2, y2, fill=COLOR_GRASS_LIGHT, outline="")
                    self.canvas.create_line(x1+10, y1+20, x1+14, y1+14, fill=COLOR_GRASS_DARK, width=2)
                    self.canvas.create_line(x1+26, y1+30, x1+30, y1+24, fill=COLOR_GRASS_DARK, width=2)

                elif tile == TILE_TALL_GRASS:
                    # Hierba alta clásica de Pokémon (densas briznas de hierba verde oscuro)
                    self.canvas.create_rectangle(x1, y1, x2, y2, fill=COLOR_GRASS_LIGHT, outline="")
                    # Briznas de hierba alta
                    for offset_x, offset_y in [(6, 12), (18, 8), (28, 14), (12, 26), (24, 24)]:
                        gx = x1 + offset_x
                        gy = y1 + offset_y
                        self.canvas.create_polygon(
                            gx, gy+12, gx+6, gy-4, gx+12, gy+12,
                            fill=COLOR_TALL_GRASS, outline=COLOR_TREE_DARK
                        )
                        self.canvas.create_line(gx+6, gy-4, gx+6, gy+8, fill=COLOR_TALL_GRASS_TIP, width=2)

                elif tile == TILE_TREE:
                    # Árbol clásico con tronco y follaje redondeado
                    self.canvas.create_rectangle(x1, y1, x2, y2, fill=COLOR_GRASS_LIGHT, outline="")
                    # Tronco
                    self.canvas.create_rectangle(x1+14, y1+22, x1+26, y1+38, fill=COLOR_TREE_TRUNK, outline="#503010")
                    # Copa del árbol
                    self.canvas.create_oval(x1+4, y1+2, x1+36, y1+30, fill=COLOR_TREE_LEAVES, outline=COLOR_TREE_DARK, width=2)
                    self.canvas.create_oval(x1+10, y1+6, x1+30, y1+24, fill="#247834", outline="")

                elif tile == TILE_WATER:
                    # Agua con pequeñas ondas
                    self.canvas.create_rectangle(x1, y1, x2, y2, fill=COLOR_WATER, outline="#3068B8")
                    self.canvas.create_line(x1+8, y1+16, x1+24, y1+16, fill=COLOR_WATER_WAVE, width=2)
                    self.canvas.create_line(x1+16, y1+28, x1+32, y1+28, fill=COLOR_WATER_WAVE, width=2)

                elif tile == TILE_FLOWER:
                    # Césped con flores rojas y amarillas
                    self.canvas.create_rectangle(x1, y1, x2, y2, fill=COLOR_GRASS_LIGHT, outline="")
                    self.canvas.create_oval(x1+12, y1+12, x1+20, y1+20, fill=COLOR_FLOWER_RED, outline="")
                    self.canvas.create_oval(x1+24, y1+22, x1+30, y1+28, fill=COLOR_FLOWER_YELLOW, outline="")

                elif tile == TILE_SIGN:
                    # Cartel de madera
                    self.canvas.create_rectangle(x1, y1, x2, y2, fill=COLOR_PATH, outline="")
                    self.canvas.create_rectangle(x1+17, y1+20, x1+23, y1+36, fill="#603818", outline="")
                    self.canvas.create_rectangle(x1+6, y1+6, x1+34, y1+24, fill="#D8A060", outline="#603818", width=2)
                    self.canvas.create_text(x1+20, y1+15, text="SIGN", font=("Arial", 6, "bold"), fill="#503010")

        # 2. Dibujar Jugador (Estilo Rojo de Pueblo Paleta)
        px = self.player.grid_x * TILE_SIZE + 20
        py = self.player.grid_y * TILE_SIZE + 20

        # Sombra suave bajo el personaje
        self.canvas.create_oval(px-12, py+10, px+12, py+18, fill="#204828", outline="")

        # Cuerpo / Ropa roja característica de Rojo Fuego
        self.canvas.create_rectangle(px-8, py-6, px+8, py+12, fill="#E83028", outline="#881010", width=1.5)
        # Pantalón azul
        self.canvas.create_rectangle(px-6, py+10, px+6, py+15, fill="#284898", outline="")
        # Cabeza y Rostro
        self.canvas.create_oval(px-8, py-18, px+8, py-4, fill="#FFD8B0", outline="#C09070")
        # Gorra roja icónica con visera blanca
        self.canvas.create_rectangle(px-9, py-22, px+9, py-14, fill="#E83028", outline="#881010")
        self.canvas.create_arc(px-10, py-24, px+10, py-12, start=0, extent=180, fill="#E83028", outline="")
        self.canvas.create_line(px-9, py-14, px+9, py-14, fill="#FFFFFF", width=3)

        # Indicador de mirada según dirección
        if self.player.direction == "up":
            self.canvas.create_rectangle(px-8, py-20, px+8, py-12, fill="#881010", outline="")
        elif self.player.direction == "left":
            self.canvas.create_rectangle(px-12, py-15, px-6, py-12, fill="#FFFFFF", outline="")
        elif self.player.direction == "right":
            self.canvas.create_rectangle(px+6, py-15, px+12, py-12, fill="#FFFFFF", outline="")

        # 3. HUD Inferior de Exploración
        hud_y = MAP_HEIGHT
        self.canvas.create_rectangle(0, hud_y, SCREEN_WIDTH, SCREEN_HEIGHT, fill=COLOR_TEXTBOX_BG, outline="#101820", width=2)
        # Borde decorativo rojo estilo Rojo Fuego
        self.canvas.create_rectangle(8, hud_y+8, SCREEN_WIDTH-8, SCREEN_HEIGHT-8, fill=COLOR_TEXTBOX_INNER, outline=COLOR_TEXTBOX_BORDER, width=3)

        # Información del Pokémon líder y notificaciones
        lead = self.player.lead_pokemon
        hp_color = self.get_hp_color(lead.hp, lead.max_hp)

        self.canvas.create_text(
            24, hud_y+24,
            text=f"EQUIPO: {lead.name} (Nv. {lead.level})",
            anchor="w", font=("Courier", 11, "bold"), fill=COLOR_TEXT_DARK
        )
        self.canvas.create_text(
            24, hud_y+42,
            text=f"PS: {lead.hp}/{lead.max_hp}",
            anchor="w", font=("Courier", 10, "bold"), fill=COLOR_TEXT_DARK
        )
        # Barra pequeña de PS
        self.canvas.create_rectangle(120, hud_y+36, 220, hud_y+46, fill=COLOR_HP_BG, outline="")
        fill_w = max(0, int(100 * (lead.hp / lead.max_hp)))
        self.canvas.create_rectangle(120, hud_y+36, 120 + fill_w, hud_y+46, fill=hp_color, outline="")

        # Mochila rápida
        self.canvas.create_text(
            240, hud_y+24,
            text=f"Mochila: Pociones ({self.player.bag['Poción']})  PokéBalls ({self.player.bag['Poké Ball']})",
            anchor="w", font=("Courier", 9), fill="#505860"
        )
        # Mensaje de orientación
        self.canvas.create_text(
            24, hud_y+75,
            text=self.notification_text,
            anchor="w", font=("Courier", 10, "bold"), fill="#C83028"
        )

        # Guía de controles a la derecha
        self.canvas.create_text(
            SCREEN_WIDTH-20, hud_y+28,
            text="[FLECHAS] Moverse por cuadrícula",
            anchor="e", font=("Courier", 9), fill="#303840"
        )
        self.canvas.create_text(
            SCREEN_WIDTH-20, hud_y+48,
            text="Camina en [HIERBA ALTA] para combate salvaje",
            anchor="e", font=("Courier", 9, "bold"), fill="#207030"
        )
        self.canvas.create_text(
            SCREEN_WIDTH-20, hud_y+68,
            text="[Z / Espacio] Curar o interactuar",
            anchor="e", font=("Courier", 8), fill="#606870"
        )

    # -------------------------------------------------------------------------
    # RENDERIZADO DEL COMBATE (ESTILO ROJO FUEGO)
    # -------------------------------------------------------------------------
    def draw_battle(self):
        """Renderiza la interfaz de batalla clásica de Pokémon Rojo Fuego / Verde Hoja."""
        self.canvas.delete("all")
        bs = self.battle

        # 1. Fondo del campo de batalla
        self.canvas.create_rectangle(0, 0, SCREEN_WIDTH, 360, fill=COLOR_BATTLE_BG_TOP, outline="")
        self.canvas.create_rectangle(0, 200, SCREEN_WIDTH, 360, fill=COLOR_BATTLE_BG_BOT, outline="")

        # Plataformas de hierba elípticas estilo GBA
        # Plataforma rival (arriba a la derecha)
        self.canvas.create_oval(380, 140, 590, 195, fill=COLOR_BATTLE_BASE, outline="#60A868", width=3)
        # Plataforma jugador (abajo a la izquierda)
        self.canvas.create_oval(60, 260, 310, 340, fill=COLOR_BATTLE_BASE, outline="#60A868", width=4)

        # 2. Sprites / Representaciones de Pokémon
        self.draw_enemy_sprite(bs.wild_poke, 485, 145)
        self.draw_player_sprite(bs.player_poke, 185, 275)

        # 3. Cuadro de Datos del Enemigo (Arriba a la Izquierda)
        enemy_box_x = 40
        enemy_box_y = 35
        self.draw_health_box(
            x=enemy_box_x, y=enemy_box_y,
            pokemon=bs.wild_poke,
            is_player=False
        )

        # 4. Cuadro de Datos del Jugador (Abajo a la Derecha)
        player_box_x = 340
        player_box_y = 210
        self.draw_health_box(
            x=player_box_x, y=player_box_y,
            pokemon=bs.player_poke,
            is_player=True
        )

        # 5. Interfaz de Control Inferior (Cuadro de Diálogo y Menús)
        self.draw_battle_bottom_ui(bs)

    def draw_health_box(self, x, y, pokemon, is_player):
        """Dibuja la tarjeta de estado GBA con nombre, nivel, barra de vida y números."""
        w, h = 260, 68
        # Sombra del cuadro
        self.canvas.create_rectangle(x+3, y+3, x+w+3, y+h+3, fill="#B8C8B8", outline="")
        # Marco del cuadro
        self.canvas.create_rectangle(x, y, x+w, y+h, fill=COLOR_BATTLE_BOX, outline=COLOR_BATTLE_BORDER, width=2.5)

        # Nombre y Nivel
        self.canvas.create_text(
            x+14, y+16,
            text=pokemon.name.upper(),
            anchor="w", font=("Courier", 11, "bold"), fill=COLOR_TEXT_DARK
        )
        self.canvas.create_text(
            x+w-20, y+16,
            text=f":L{pokemon.level}",
            anchor="e", font=("Courier", 10, "bold"), fill="#B03020"
        )

        # Etiqueta "HP" con fondo oscuro
        self.canvas.create_rectangle(x+20, y+30, x+46, y+43, fill="#383840", outline="")
        self.canvas.create_text(x+33, y+36, text="PS", font=("Courier", 8, "bold"), fill="#F8B020")

        # Barra de Vida (HP Bar)
        bar_x = x + 50
        bar_y = y + 32
        bar_w = 180
        bar_h = 9

        self.canvas.create_rectangle(bar_x, bar_y, bar_x+bar_w, bar_y+bar_h, fill=COLOR_HP_BG, outline="#202028")
        ratio = max(0.0, pokemon.hp / pokemon.max_hp)
        fill_width = int(bar_w * ratio)
        hp_color = self.get_hp_color(pokemon.hp, pokemon.max_hp)

        if fill_width > 0:
            self.canvas.create_rectangle(bar_x, bar_y, bar_x+fill_width, bar_y+bar_h, fill=hp_color, outline="")

        # Números de PS (Sólo para el Pokémon del jugador, igual que en GBA)
        if is_player:
            self.canvas.create_text(
                x+w-18, y+53,
                text=f"{pokemon.hp}/ {pokemon.max_hp}",
                anchor="e", font=("Courier", 10, "bold"), fill=COLOR_TEXT_DARK
            )
            # Pequeña barra de experiencia
            self.canvas.create_rectangle(bar_x, y+58, bar_x+bar_w, y+62, fill="#404850", outline="")
            self.canvas.create_rectangle(bar_x, y+58, bar_x+int(bar_w*0.7), y+62, fill="#4880E8", outline="")

    def draw_enemy_sprite(self, pokemon, cx, cy):
        """Dibuja una representación pixel-art vectorizada del Pokémon rival."""
        name = pokemon.sprite_id

        if name == "pidgey":
            # Pidgey: cuerpo marrón, pecho crema, máscara facial y pico
            self.canvas.create_oval(cx-26, cy-20, cx+26, cy+25, fill="#A87040", outline="#603818", width=2)
            self.canvas.create_oval(cx-18, cy-5, cx+18, cy+24, fill="#F0D8A0", outline="")
            # Cabeza y cresta
            self.canvas.create_oval(cx-20, cy-45, cx+20, cy-12, fill="#A87040", outline="#603818", width=2)
            self.canvas.create_polygon(cx-10, cy-45, cx+5, cy-58, cx+18, cy-40, fill="#D83020", outline="#801810")
            # Ojo y antifaz negro
            self.canvas.create_polygon(cx-12, cy-30, cx+8, cy-34, cx+2, cy-22, fill="#202020", outline="")
            self.canvas.create_oval(cx-6, cy-30, cx+2, cy-22, fill="#FFFFFF", outline="")
            self.canvas.create_oval(cx-3, cy-28, cx+1, cy-24, fill="#000000", outline="")
            # Pico rosa/amarillo
            self.canvas.create_polygon(cx-22, cy-22, cx-12, cy-27, cx-12, cy-18, fill="#F8B080", outline="#A05030")

        elif name == "rattata":
            # Rattata: púrpura brillante, orejas grandes y bigotes
            self.canvas.create_oval(cx-28, cy-15, cx+28, cy+25, fill="#9058B8", outline="#502870", width=2)
            self.canvas.create_oval(cx-15, cy, cx+22, cy+24, fill="#E8D8B0", outline="")
            # Cabeza
            self.canvas.create_oval(cx-25, cy-35, cx+15, cy-5, fill="#9058B8", outline="#502870", width=2)
            # Orejas con interior rosado
            self.canvas.create_oval(cx-30, cy-55, cx-10, cy-30, fill="#9058B8", outline="#502870")
            self.canvas.create_oval(cx-26, cy-50, cx-14, cy-35, fill="#F8A8B8", outline="")
            # Ojo rojo
            self.canvas.create_oval(cx-16, cy-26, cx-6, cy-16, fill="#E83028", outline="#202020")
            self.canvas.create_oval(cx-12, cy-24, cx-8, cy-20, fill="#FFFFFF", outline="")
            # Dientes prominentes
            self.canvas.create_rectangle(cx-24, cy-14, cx-18, cy-6, fill="#FFFFFF", outline="#303030")

        elif name == "oddish":
            # Oddish: bulbo azul oscuro con hojas verdes altas
            # Hojas superiores
            for ox, oy, deg in [(-20, -45, -25), (0, -55, 0), (20, -45, 25)]:
                self.canvas.create_polygon(
                    cx, cy-15,
                    cx+ox, cy+oy,
                    cx+ox+10, cy+oy+20,
                    fill="#38A048", outline="#186028", width=2
                )
            # Cuerpo azul
            self.canvas.create_oval(cx-24, cy-20, cx+24, cy+26, fill="#284888", outline="#102050", width=2)
            # Ojos rojos simples
            self.canvas.create_oval(cx-12, cy-4, cx-4, cy+8, fill="#E83028", outline="")
            self.canvas.create_oval(cx+4, cy-4, cx+12, cy+8, fill="#E83028", outline="")

        else:
            # Pikachu u otros
            self.canvas.create_oval(cx-25, cy-15, cx+25, cy+25, fill="#F8D030", outline="#B89810", width=2)
            self.canvas.create_oval(cx-20, cy-40, cx+20, cy-5, fill="#F8D030", outline="#B89810", width=2)
            # Orejas con puntas negras
            self.canvas.create_polygon(cx-20, cy-35, cx-35, cy-65, cx-10, cy-45, fill="#F8D030", outline="#B89810")
            self.canvas.create_polygon(cx-35, cy-65, cx-24, cy-52, cx-30, cy-45, fill="#181818", outline="")
            self.canvas.create_polygon(cx+20, cy-35, cx+35, cy-65, cx+10, cy-45, fill="#F8D030", outline="#B89810")
            # Mejillas rojas eléctricas
            self.canvas.create_oval(cx-18, cy-18, cx-8, cy-8, fill="#E83028", outline="")
            self.canvas.create_oval(cx+8, cy-18, cx+18, cy-8, fill="#E83028", outline="")

    def draw_player_sprite(self, pokemon, cx, cy):
        """Dibuja la perspectiva trasera (back-sprite) de Charmander."""
        # Cola con llama ardiente
        self.canvas.create_polygon(
            cx-50, cy+25, cx-35, cy-5, cx-20, cy+25,
            fill="#E86820", outline="#983808", width=2
        )
        # Fuego animado en la cola
        self.canvas.create_polygon(
            cx-55, cy+5, cx-40, cy-25, cx-30, cy+5,
            fill="#F8D030", outline="#E84020", width=2
        )
        self.canvas.create_polygon(
            cx-50, cy-2, cx-42, cy-18, cx-36, cy-2,
            fill="#FFFFFF", outline=""
        )

        # Espalda de Charmander (Naranja rojizo cálido)
        self.canvas.create_oval(cx-36, cy-25, cx+36, cy+42, fill="#E86820", outline="#983808", width=3)
        # Cabeza vista desde atrás
        self.canvas.create_oval(cx-30, cy-65, cx+26, cy-15, fill="#E86820", outline="#983808", width=3)
        # Brazo derecho extendido hacia la batalla
        self.canvas.create_oval(cx+15, cy-12, cx+40, cy+15, fill="#E86820", outline="#983808", width=2)

    def draw_battle_bottom_ui(self, bs):
        """Dibuja el cuadro de diálogo inferior con los 4 botones o la lista de movimientos."""
        box_y = 355
        box_h = 125

        # Fondo del cuadro de diálogo estilo Rojo Fuego
        self.canvas.create_rectangle(0, box_y, SCREEN_WIDTH, SCREEN_HEIGHT, fill=COLOR_TEXTBOX_BG, outline="#181820", width=3)
        self.canvas.create_rectangle(6, box_y+6, SCREEN_WIDTH-6, SCREEN_HEIGHT-6, fill=COLOR_TEXTBOX_INNER, outline=COLOR_TEXTBOX_BORDER, width=4)

        if bs.state in (BattleSystem.STATE_INTRO, BattleSystem.STATE_DIALOG, BattleSystem.STATE_FINISHED):
            # Modo Diálogo / Narrador de combate
            self.canvas.create_text(
                32, box_y + 40,
                text=bs.dialog_text,
                anchor="w", font=("Courier", 13, "bold"), fill=COLOR_TEXT_DARK
            )
            # Flechita roja parpadeante de continuar
            self.canvas.create_polygon(
                SCREEN_WIDTH-36, SCREEN_HEIGHT-26,
                SCREEN_WIDTH-24, SCREEN_HEIGHT-26,
                SCREEN_WIDTH-30, SCREEN_HEIGHT-16,
                fill=COLOR_TEXTBOX_BORDER, outline=""
            )
            self.canvas.create_text(
                SCREEN_WIDTH-46, SCREEN_HEIGHT-22,
                text="[Z / Clic]",
                anchor="e", font=("Courier", 9), fill="#707880"
            )

        elif bs.state == BattleSystem.STATE_ACTION_MENU:
            # Pregunta clásica
            self.canvas.create_text(
                28, box_y + 40,
                text=f"¿Qué debería hacer\n{bs.player_poke.name.upper()}?",
                anchor="w", font=("Courier", 12, "bold"), fill=COLOR_TEXT_DARK
            )

            # 4 Botones principales estilo Rojo Fuego
            buttons = [
                ("LUCHAR", COLOR_BTN_FIGHT, 360, 375, 480, 415, 0),
                ("MOCHILA", COLOR_BTN_BAG, 500, 375, 620, 415, 1),
                ("POKÉMON", COLOR_BTN_POKEMON, 360, 425, 480, 465, 2),
                ("HUIR", COLOR_BTN_RUN, 500, 425, 620, 465, 3),
            ]

            for label, color, x1, y1, x2, y2, idx in buttons:
                is_sel = (bs.selected_action == idx)
                border_col = "#202020" if not is_sel else "#F8F820"
                border_w = 2 if not is_sel else 3.5

                self.canvas.create_rectangle(x1, y1, x2, y2, fill=color, outline=border_col, width=border_w)
                self.canvas.create_text(
                    (x1+x2)//2, (y1+y2)//2,
                    text=label,
                    font=("Courier", 11, "bold"), fill="#FFFFFF"
                )
                if is_sel:
                    # Flecha selectora amarilla
                    self.canvas.create_polygon(
                        x1-8, (y1+y2)//2,
                        x1-16, (y1+y2)//2 - 6,
                        x1-16, (y1+y2)//2 + 6,
                        fill="#F8D030", outline="#806010"
                    )

        elif bs.state == BattleSystem.STATE_MOVE_MENU:
            # Despliegue de los 4 movimientos con PP y tipo
            moves = bs.player_poke.moves
            coords = [
                (30, 375, 230, 415, 0),
                (250, 375, 450, 415, 1),
                (30, 425, 230, 465, 2),
                (250, 425, 450, 465, 3),
            ]

            for i, (x1, y1, x2, y2, idx) in enumerate(coords):
                if idx < len(moves):
                    m = moves[idx]
                    is_sel = (bs.selected_move == idx)
                    bg = "#E8E8F0" if not is_sel else "#FFE8A0"
                    self.canvas.create_rectangle(x1, y1, x2, y2, fill=bg, outline="#505060", width=1.5)
                    self.canvas.create_text(
                        x1+10, (y1+y2)//2,
                        text=m.name.upper(),
                        anchor="w", font=("Courier", 10, "bold"), fill=COLOR_TEXT_DARK
                    )
                    if is_sel:
                        self.canvas.create_polygon(
                            x1-4, (y1+y2)//2,
                            x1-10, (y1+y2)//2 - 5,
                            x1-10, (y1+y2)//2 + 5,
                            fill="#E83028", outline=""
                        )

            # Panel de PP y TIPO del movimiento seleccionado (a la derecha)
            if bs.selected_move < len(moves):
                cur_m = moves[bs.selected_move]
                self.canvas.create_rectangle(470, 372, 620, 468, fill="#F0F0F8", outline="#808890", width=2)
                self.canvas.create_text(
                    480, 395,
                    text=f"PP {cur_m.pp}/{cur_m.max_pp}",
                    anchor="w", font=("Courier", 11, "bold"), fill="#202028"
                )
                self.canvas.create_text(
                    480, 420,
                    text=f"TIPO/{cur_m.move_type}",
                    anchor="w", font=("Courier", 10, "bold"), fill="#803020"
                )
                self.canvas.create_text(
                    480, 445,
                    text="[X] Volver",
                    anchor="w", font=("Courier", 9, "bold"), fill="#606870"
                )

    def get_hp_color(self, hp, max_hp):
        """Determina el color de la barra de salud (Verde >50%, Amarillo >20%, Rojo <=20%)."""
        ratio = hp / max(1, max_hp)
        if ratio > 0.5:
            return COLOR_HP_GREEN
        elif ratio > 0.2:
            return COLOR_HP_YELLOW
        return COLOR_HP_RED

    # -------------------------------------------------------------------------
    # BUCLE PRINCIPAL DE JUEGO (GAME LOOP)
    # -------------------------------------------------------------------------
    def update_loop(self):
        """Bucle continuo a ~30 FPS usando root.after para compatibilidad Tkinter."""
        if self.running:
            if self.game_state == "world":
                self.draw_world()
            elif self.game_state == "battle":
                self.draw_battle()

            self.root.after(33, self.update_loop)

    def run(self):
        """Inicia el ciclo principal de Tkinter."""
        self.root.mainloop()


# -----------------------------------------------------------------------------
# PUNTO DE ENTRADA PRINCIPAL
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("Iniciando Pokémon Rojo Fuego / Verde Hoja (Python Tkinter Engine)...")
    game = Game()
    game.run()
