// SPDX-License-Identifier: UNLICENSE
pragma solidity >=0.8.0 <0.9.0;

contract PublicNotepad {
    struct Note {
        address author;
        string content;
        uint256 timestamp;
    }

    Note[] public notes;

    event NoteAdded(address indexed author, string content, uint256 timestamp);

    function addNote(string memory _content) public {
        notes.push(
            Note({
                author: msg.sender,
                content: _content,
                timestamp: block.timestamp
            })
        );
        require(bytes(_content).length > 0);

        emit NoteAdded(msg.sender, _content, block.timestamp);
    }

    function getAllNotes() public view returns (Note[] memory) {
        return notes;
    }
}
