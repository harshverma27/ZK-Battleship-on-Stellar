use std::hash::poseidon;

// Ship sizes: Carrier=5, Battleship=4, Cruiser=3, Submarine=3, Destroyer=2
global SHIP_SIZES: [u32; 5] = [5, 4, 3, 3, 2];
global BOARD_SIZE: u32 = 10;

// Shot circuit: Proves a shot is a hit or miss without revealing ship positions
//
// The defending player uses this circuit to prove that the attacker's shot
// at (shot_x, shot_y) results in the claimed hit/miss outcome, and that
// their board matches the previously committed hash.

fn main(
    // Private inputs - the defender's secret board
    ship_x: [Field; 5],
    ship_y: [Field; 5],
    ship_o: [Field; 5],
    salt: Field,
    // Public inputs - known to both players and verified on-chain
    board_hash: pub Field,    // previously committed board hash
    shot_x: pub Field,        // x coordinate of the shot
    shot_y: pub Field,        // y coordinate of the shot
    hit: pub Field            // 1 = hit, 0 = miss
) {
    // 1. Verify the board hash commitment matches
    let mut hash_inputs: [Field; 16] = [0; 16];
    for i in 0..5 {
        hash_inputs[i * 3] = ship_x[i];
        hash_inputs[i * 3 + 1] = ship_y[i];
        hash_inputs[i * 3 + 2] = ship_o[i];
    }
    hash_inputs[15] = salt;

    let computed_hash = poseidon::bn254::hash_16(hash_inputs);
    assert(computed_hash == board_hash, "Board hash does not match commitment");

    // 2. Verify shot coordinates are within bounds
    let sx = shot_x as u32;
    let sy = shot_y as u32;
    assert(sx < BOARD_SIZE, "Shot x out of bounds");
    assert(sy < BOARD_SIZE, "Shot y out of bounds");

    // 3. Check if the shot hits any ship cell
    let mut is_hit: bool = false;

    for i in 0..5 {
        let x = ship_x[i] as u32;
        let y = ship_y[i] as u32;
        let o = ship_o[i] as u32;
        let size = SHIP_SIZES[i];

        for j in 0..5 {
            if j < size {
                let cell_x: u32 = if o == 0 { x + j } else { x };
                let cell_y: u32 = if o == 0 { y } else { y + j };

                if (cell_x == sx) & (cell_y == sy) {
                    is_hit = true;
                }
            }
        }
    }

    // 4. Constrain the claimed result matches the actual result
    let hit_value = hit as u32;
    assert(hit_value <= 1, "Hit must be 0 or 1");

    if is_hit {
        assert(hit == 1, "Claimed miss but coordinate is a hit");
    } else {
        assert(hit == 0, "Claimed hit but coordinate is a miss");
    }
}

#[test]
fn test_valid_hit() {
    // Ship at (0,0) horizontal, size 5 => occupies (0,0) to (4,0)
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

    // Shot at (2, 0) should be a hit (carrier occupies 0,0 to 4,0)
    main(ship_x, ship_y, ship_o, salt, board_hash, 2, 0, 1);
}

#[test]
fn test_valid_miss() {
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

    // Shot at (9, 9) should be a miss
    main(ship_x, ship_y, ship_o, salt, board_hash, 9, 9, 0);
}

#[test(should_fail_with = "Claimed hit but coordinate is a miss")]
fn test_lying_about_hit() {
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

    // Trying to claim (9,9) is a hit when it's a miss
    main(ship_x, ship_y, ship_o, salt, board_hash, 9, 9, 1);
}

#[test(should_fail_with = "Claimed miss but coordinate is a hit")]
fn test_lying_about_miss() {
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

    // Trying to claim (0,0) is a miss when it's a hit
    main(ship_x, ship_y, ship_o, salt, board_hash, 0, 0, 0);
}

#[test(should_fail)]
fn test_wrong_board_hash() {
    let ship_x = [0, 0, 0, 0, 0];
    let ship_y = [0, 1, 2, 3, 4];
    let ship_o = [0, 0, 0, 0, 0];
    let salt = 12345;

    // Wrong hash - trying to use a different board
    let wrong_hash = 999999;

    main(ship_x, ship_y, ship_o, salt, wrong_hash, 0, 0, 1);
}
