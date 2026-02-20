use std::hash::poseidon;

// Ship sizes: Carrier=5, Battleship=4, Cruiser=3, Submarine=3, Destroyer=2
global SHIP_SIZES: [u32; 5] = [5, 4, 3, 3, 2];
global BOARD_SIZE: u32 = 10;
global TOTAL_SHIP_CELLS: u32 = 17; // 5+4+3+3+2

// Board circuit: Proves valid ship placement and generates board commitment
// 
// Each ship is defined by:
//   x: starting column (0-9)
//   y: starting row (0-9)  
//   orientation: 0 = horizontal, 1 = vertical
//
// Private inputs: ships (5 ships × 3 values = 15 fields), salt
// Public inputs: board_hash (Poseidon commitment)

fn main(
    // Private inputs - the player's secret board configuration
    ship_x: [Field; 5],       // x coords of each ship's starting position
    ship_y: [Field; 5],       // y coords of each ship's starting position
    ship_o: [Field; 5],       // orientation: 0=horizontal, 1=vertical
    salt: Field,              // random salt for commitment
    // Public inputs - committed on-chain
    board_hash: pub Field     // Poseidon(ships || salt)
) {
    // We'll build a 10x10 occupancy grid to check for overlaps
    let mut board: [[bool; 10]; 10] = [[false; 10]; 10];

    // Validate each ship placement
    for i in 0..5 {
        let x = ship_x[i] as u32;
        let y = ship_y[i] as u32;
        let o = ship_o[i] as u32;
        let size = SHIP_SIZES[i];

        // Orientation must be 0 or 1
        assert(o <= 1, "Orientation must be 0 (horizontal) or 1 (vertical)");

        // Ship must fit within board boundaries
        if o == 0 {
            // Horizontal: x + size <= BOARD_SIZE
            assert(x + size <= BOARD_SIZE, "Ship extends beyond board (horizontal)");
            assert(y < BOARD_SIZE, "Ship y-coordinate out of bounds");
        } else {
            // Vertical: y + size <= BOARD_SIZE
            assert(x < BOARD_SIZE, "Ship x-coordinate out of bounds");
            assert(y + size <= BOARD_SIZE, "Ship extends beyond board (vertical)");
        }

        // Place ship cells and check for overlaps
        for j in 0..5 {
            // Only process cells within the ship's actual size
            if j < size {
                let cell_x: u32 = if o == 0 { x + j } else { x };
                let cell_y: u32 = if o == 0 { y } else { y + j };

                // Check no overlap with previously placed ships
                assert(!board[cell_y][cell_x], "Ships overlap!");

                // Mark cell as occupied
                board[cell_y][cell_x] = true;
            }
        }
    }

    // Verify the Poseidon hash commitment
    // Hash all ship data + salt together
    let mut hash_inputs: [Field; 16] = [0; 16];
    for i in 0..5 {
        hash_inputs[i * 3] = ship_x[i];
        hash_inputs[i * 3 + 1] = ship_y[i];
        hash_inputs[i * 3 + 2] = ship_o[i];
    }
    hash_inputs[15] = salt;

    let computed_hash = poseidon::bn254::hash_16(hash_inputs);
    assert(computed_hash == board_hash, "Board hash does not match commitment");
}

#[test]
fn test_valid_board() {
    // Valid board: ships placed without overlaps
    // Carrier (5): horizontal at (0,0)
    // Battleship (4): horizontal at (0,1)
    // Cruiser (3): horizontal at (0,2)
    // Submarine (3): horizontal at (0,3)
    // Destroyer (2): horizontal at (0,4)
    let ship_x = [0, 0, 0, 0, 0];
    let ship_y = [0, 1, 2, 3, 4];
    let ship_o = [0, 0, 0, 0, 0];
    let salt = 12345;

    let mut hash_inputs: [Field; 16] = [0; 16];
    for i in 0..5 {
        hash_inputs[i * 3] = ship_x[i];
        hash_inputs[i * 3 + 1] = ship_y[i];
        hash_inputs[i * 3 + 2] = ship_o[i];
    }
    hash_inputs[15] = salt;
    let board_hash = poseidon::bn254::hash_16(hash_inputs);

    main(ship_x, ship_y, ship_o, salt, board_hash);
}

#[test(should_fail_with = "Ships overlap")]
fn test_overlapping_ships() {
    // Two ships placed at the same position
    let ship_x = [0, 0, 0, 0, 0];
    let ship_y = [0, 0, 2, 3, 4]; // Carrier and Battleship both at row 0
    let ship_o = [0, 0, 0, 0, 0];
    let salt = 12345;

    let mut hash_inputs: [Field; 16] = [0; 16];
    for i in 0..5 {
        hash_inputs[i * 3] = ship_x[i];
        hash_inputs[i * 3 + 1] = ship_y[i];
        hash_inputs[i * 3 + 2] = ship_o[i];
    }
    hash_inputs[15] = salt;
    let board_hash = poseidon::bn254::hash_16(hash_inputs);

    main(ship_x, ship_y, ship_o, salt, board_hash);
}

#[test(should_fail)]
fn test_wrong_hash() {
    let ship_x = [0, 0, 0, 0, 0];
    let ship_y = [0, 1, 2, 3, 4];
    let ship_o = [0, 0, 0, 0, 0];
    let salt = 12345;

    // Use wrong hash
    let wrong_hash = 999999;

    main(ship_x, ship_y, ship_o, salt, wrong_hash);
}
