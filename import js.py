import js
import time
from pyodide.ffi import create_proxy
from random import randint


class Pathfinder():
    
    def __init__(self):
        # Initialize grid and cells
        self.start_endpoint_id = "0000"
        self.finish_endpoint_id = "0909"
        self.grid_size = 10
        self.moving = False
        self.selector = js.document.getElementsByClassName("size_selector")[0]
        self.grid = js.document.getElementsByClassName("grid_div")
        self.status = js.document.getElementsByClassName("status")[0]

        self.create_grid()

        self.cells = self.init_cells()  # Initialize the grid cells
        self.moving_cells = []
        self.add_numbers_to_select()
        self.add_events()
        self.add_button_events()
        self.enable_buttons()

        self.status.innerHTML = "Ready"

    def add_numbers_to_select(self):
        for i in range(100):
            new_value = js.document.createElement('option')
            new_value.innerHTML = i+1
            if (i+1 == 10):
                new_value.setAttribute('selected', True)
            self.selector.appendChild(new_value)

    def restart_grid(self, event):
        # print("Restarting Grid")
        for row in self.cells:
            for cell in row:
                cell.className = ""  # Clear any classes
                cell.innerHTML = ""   # Clear inner content
    
        self.cells = self.init_cells()  # Initialize the grid cells

        self.enable_buttons()

        self.status.innerHTML = "Ready"

    def disable_buttons(self):
        self.start_btn.setAttribute("disabled", "true")
        self.random_btn.setAttribute("disabled", "true")
    
    def enable_buttons(self):
        self.start_btn.removeAttribute("disabled")
        self.random_btn.removeAttribute("disabled")

    def disable_all(self):
        self.disable_buttons()
        self.restart_btn.setAttribute("disabled", "true")
    
    def enable_all(self):
        self.enable_buttons()
        self.restart_btn.removeAttribute("disabled")

    def add_button_events(self):
        self.change_size_btn = js.document.getElementsByClassName("change_size_btn")[0]
        change_size_proxy = create_proxy(self.change_size)
        self.change_size_btn.addEventListener("click", change_size_proxy)

        self.start_btn = js.document.getElementsByClassName("start_btn")[0]
        start_pathfinder_proxy = create_proxy(self.start_pathfinder)
        self.start_btn.addEventListener("click", start_pathfinder_proxy)

        self.restart_btn = js.document.getElementsByClassName("restart_btn")[0]
        restart_pathfinder_proxy = create_proxy(self.restart_grid)
        self.restart_btn.addEventListener("click", restart_pathfinder_proxy)

        self.random_btn = js.document.getElementsByClassName("random_btn")[0]
        random_grid_proxy = create_proxy(self.random_grid)
        self.random_btn.addEventListener("click", random_grid_proxy)

        self.move_endpoints_btn = js.document.getElementsByClassName("move_endpoints_btn")[0]
        move_endpoints_proxy = create_proxy(self.move_endpoints)
        self.move_endpoints_btn.addEventListener("click", move_endpoints_proxy)

        self.test_grid_btn = js.document.getElementsByClassName("test_grid_btn")[0]
        test_grid_proxy = create_proxy(self.test_grid)
        self.test_grid_btn.addEventListener("click", test_grid_proxy)
    
    def test_grid(self, event):
        print("Testing Grid")
        success = 0
        while success < 5:
            self.restart_grid(None)
            # self.random_grid(None)
            start_time = time.time()
            if(self.start_pathfinder(None)):
                print(f"Time: {(time.time() - start_time) * 1000}")
                success = success + 1

    def change_size(self, event):
        self.grid_size = int(self.selector.value)   
        grid_div = js.document.getElementsByClassName("grid_div")[0]
        grid_div.innerHTML = ''
        self.create_grid()
        self.restart_grid(None)
        self.add_events()
        self.move_endpoints(None)
        
    def create_grid(self):
        grid_div = js.document.getElementsByClassName("grid_div")[0]
        table = js.document.createElement('table')
        for i in range(self.grid_size):
            tr = js.document.createElement('tr')
            for j in range(self.grid_size):
                td = js.document.createElement('td')
                id_first_digit = str(i)
                id_second_digit = str(j)

                if len(id_first_digit) == 1:
                    id_first_digit = '0' + id_first_digit
                if len(id_second_digit) == 1:
                    id_second_digit = '0' + id_second_digit
                td.setAttribute("id", f"{id_first_digit}{id_second_digit}");

                tr.appendChild(td)
            table.appendChild(tr)
        grid_div.appendChild(table)
        

    def move_endpoints(self, event):
        self.restart_grid(None)
        self.moving = True

        self.status.innerHTML = "Not Ready"
        self.disable_all()
        print(f"Movement of endpoints initated\n\tPress any cell to set new START")

        start_cell = js.document.getElementById(self.start_endpoint_id)
        start_cell.innerHTML = self.start_endpoint_id
        start_cell.className = ""

        end_cell = js.document.getElementById(self.finish_endpoint_id)
        end_cell.innerHTML = self.finish_endpoint_id
        end_cell.className = ""

    def new_endpoints(self):
        print("New endpoints set:")

        self.start_endpoint_id = self.moving_cells[0]
        self.finish_endpoint_id = self.moving_cells[1]

        print(f"\tNew start: {self.start_endpoint_id}")
        print(f"\tNew end: {self.finish_endpoint_id}")

        new_start_cell = js.document.getElementById(self.moving_cells[0])
        new_end_cell = js.document.getElementById(self.moving_cells[1])

        new_start_cell.className = ""
        new_start_cell.classList.add("start_cell")
        new_start_cell.innerHTML = "START"

        new_end_cell.className = ""
        new_end_cell.classList.add("end_cell")
        new_end_cell.innerHTML = "END"

        self.moving = False
        self.status.innerHTML = "Ready"
        self.enable_all()

    def init_cells(self):
        self.cells = []  # Reset the cells list

        start_cell_first_digit = self.start_endpoint_id[0:2]
        start_cell_second_digit = self.start_endpoint_id[-2:]
        end_cell_first_digit = self.finish_endpoint_id[0:2]
        end_cell_second_digit = self.finish_endpoint_id[-2:]

        for i in range(self.grid_size):
            row = []
            for j in range(self.grid_size):

                id_first_digit = str(i)
                id_second_digit = str(j)
                if len(id_first_digit) == 1:
                    id_first_digit = '0' + id_first_digit
                if len(id_second_digit) == 1:
                    id_second_digit = '0' + id_second_digit

                cell = js.document.getElementById(f"{id_first_digit}{id_second_digit}")
                
                if (id_first_digit == start_cell_first_digit and id_second_digit == start_cell_second_digit):
                    cell.innerHTML = "START"
                    cell.classList.add("start_cell")
                    row.append(cell)
                
                elif (id_first_digit == end_cell_first_digit and id_second_digit == end_cell_second_digit):
                    cell.innerHTML = "END"
                    cell.classList.add("end_cell")
                    row.append(cell)
                
                else:
                    cell.innerHTML = f"{id_first_digit}{id_second_digit}"
                    cell.className = ""  # Clear previous class names
                    cell.classList.add("open_cell")  # Set default class
                    row.append(cell)

            self.cells.append(row)
        return self.cells  # Return the cells for use
    
    def random_grid(self, event):
        for row in self.cells:
            for cell in row:
                if cell.id == self.start_endpoint_id or cell.id == self.finish_endpoint_id:
                    continue
                n = randint(0, 3)
                if n == 3:
                    cell.classList.remove("open_cell")
                    cell.classList.add("closed_cell")
                else:
                    cell.classList.remove("closed_cell")
                    cell.classList.add("open_cell")
    
    def add_events(self):
        for row in self.cells:
            for cell in row:
                click_proxy = create_proxy(self.block_cell)
                cell.addEventListener("click", click_proxy)  # Attach event listener

    def block_cell(self, event):
        clicked_cell_id = event.target.id
        if self.moving:
            self.moving_cells.append(clicked_cell_id)
            if len(self.moving_cells) == 2:
                if self.moving_cells[0] == self.moving_cells[1]:
                    print("End point cannot be the same as start point")
                    self.moving_cells = self.moving_cells[:-1]
                    return
                self.new_endpoints()
                self.moving_cells = []
            if len(self.moving_cells) == 1:
                event.target.classList.add("temp_start")
                print(f"\tPress any cell to set new END")
            return

        if clicked_cell_id == self.start_endpoint_id or clicked_cell_id == self.finish_endpoint_id:
            return
        
        # Get the ID of the clicked cell
        clicked_cell = event.target
        if clicked_cell.classList.contains("open_cell"):
            clicked_cell.classList.remove("open_cell")
            clicked_cell.classList.add("closed_cell")
            print(f"Blocking cell {clicked_cell.id}")  # Log cell ID
        else:
            clicked_cell.classList.remove("closed_cell")
            clicked_cell.classList.add("open_cell")
            print(f"Opening cell {clicked_cell.id}")  # Log cell ID

    def transform_no_path(self):
        for row in self.cells:
            for cell in row:
                if cell.id != self.start_endpoint_id and cell.id != self.finish_endpoint_id:
                    if cell.classList.contains("closed_cell"):
                        cell.classList.add("negative_cell")
                        cell.innerHTML = ""
    
    def transform_shortest_path(self, current_cell_id, parent_dict):
        self.status.innerHTML = "Path Found"
        while current_cell_id != self.start_endpoint_id:
            current_cell = js.document.getElementById(current_cell_id)  # getting cell by id
            
            if current_cell_id != self.start_endpoint_id and current_cell_id != self.finish_endpoint_id:
                current_cell.classList.remove("moving_cell")
                current_cell.classList.add("shortest_path_cell")

            current_cell_id = parent_dict[current_cell_id]

    def start_pathfinder(self, event):
        self.disable_buttons()

        initial_cell = js.document.getElementById(self.start_endpoint_id)
        initial_cell_id = initial_cell.id
        final_cell = js.document.getElementById(self.finish_endpoint_id)
        final_cell_id = final_cell.id
        
        queue = []
        queue.append(initial_cell_id)
        
        seen_cells = []
        seen_cells.append(initial_cell_id)
        return self.path_bfs(queue, seen_cells)

    def path_bfs(self, queue, seen_cells):
        parent_dict = dict()
        while len(queue) > 0:
            current_cell_id = queue.pop(0)  # Get next queue item
            current_cell = js.document.getElementById(current_cell_id)  # Get cell by id
    
            if current_cell_id == self.finish_endpoint_id:  # Reached the end cell
                self.transform_shortest_path(current_cell_id, parent_dict)
                return True
    
            possible_movements = []
            
            id_first_digit = int(current_cell_id[:2])
            id_second_digit = int(current_cell_id[2:])
            
            if id_first_digit > 0:  # Move up
                possible_movements.append(js.document.getElementById(f"{id_first_digit-1:02}{id_second_digit:02}"))
            if id_first_digit < self.grid_size - 1:  # Move down
                possible_movements.append(js.document.getElementById(f"{id_first_digit+1:02}{id_second_digit:02}"))
            if id_second_digit > 0:  # Move left
                possible_movements.append(js.document.getElementById(f"{id_first_digit:02}{id_second_digit-1:02}"))
            if id_second_digit < self.grid_size - 1:  # Move right
                possible_movements.append(js.document.getElementById(f"{id_first_digit:02}{id_second_digit+1:02}"))
            
            for cell in possible_movements:
                if cell.id in seen_cells:  # Skip already seen cells
                    continue
                if cell.classList.contains("closed_cell"):  # Skip blocked cells
                    continue
    
                # Mark cell as seen
                seen_cells.append(cell.id)
                queue.append(cell.id)  # Enqueue for future exploration
    
                parent_dict[cell.id] = current_cell_id
    
                if cell.id != self.start_endpoint_id and cell.id != self.finish_endpoint_id:
                    cell.classList.add("moving_cell")  # Visual representation of movement
    
        # print("No path found!")
        self.status.innerHTML = "No path"
        self.transform_no_path()
        return False

Pathfinder()