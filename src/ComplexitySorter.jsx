// ComplexitySorter.jsx (Updated for Dnd Kit)

import React, { useState, useEffect, useRef } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core'; // Core Dnd Kit components
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  arrayMove 
} from '@dnd-kit/sortable'; // Sortable components
import { Button, Typography, Container, Box, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import VideoCard from './VideoCard'; 
import EmailFormModal from './EmailFormModal';
import * as XLSX from 'xlsx'; 

function parseParams(name) {
	const params = {};
        console.log("NAME IS ", name);
	const parts = name.split("_");
	for (var i=0; i<parts.length; i++) {
		const [key, paramvalue] = parts[i].split("=");
		params[key] = parseFloat(paramvalue);
	}
	return params;
}

function groupParams(files, paramName, start, end, step) {
	const groups = {};
	console.log(files);
	for (var i=start; i<=end; i+=step) {
		groups[i] = [];
	}
	for (const file in files) {
		console.log(file);
		const params = parseParams(file.name); // get parameters from file
		const val = params[paramName]; // get parameter paramName value
		if (val in groups) {
			groups[val].push(file); // add file if in groups
		}
	}
	return groups;
}


var chosenData = [];

const exportToExcel = () => {
    // 1. Prepare the data: Your 'items' state is an array of objects (JSON data)
    const dataToExport = chosenData.map((item, index) => ({
        Rank: index + 1, // Add the final rank based on the sorted position
        ID: item.id,
        Name: item.name,
        Complexity_Score: item.complexity_score, // Assuming your item object has these fields
        // Add any other fields you want to see in the Excel file
    }));

    // 2. Convert the JSON data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Optional: Set column widths for better display (e.g., column B (Name) width)
    worksheet['!cols'] = [
      { wch: 8 }, // Rank
      { wch: 15 }, // ID
      { wch: 40 }, // Name
      { wch: 20 } // Complexity Score
    ];

    // 3. Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sorted Results");

    // 4. Write the workbook to a file and trigger the download
    XLSX.writeFile(workbook, "Complexity_Sort_Results.xlsx");
};

export default function ComplexitySorter(data, chosenData) {

console.log("videodata: ", data);
const groups = [];
const visGroups = groupParams(data, "vis", 2, 10, 2);
groups.push(visGroups);
const maxalignturnGroups = groupParams(data, "maxalignturn", 3, 15, 3);
groups.push(maxalignturnGroups);
const maxcohereturnGroups = groupParams(data, "maxcohereturn", 4, 20, 4);
groups.push(maxcohereturnGroups);
const maxsepturnGroups = groupParams(data, "maxsepturn", 3, 15, 3);
groups.push(maxsepturnGroups);

for (var i=0; i<groups.length; i++) {
	chosenData.push(groups[Math.floor(Math.random() * data.length)]);
}

  const [items, setItems] = useState(chosenData);
  const [message, setMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);

  // Get an array of IDs from the items state, required for SortableContext
  const itemIds = items.map(item => item.id);

  // --- Dnd Kit Drag End Handler ---
  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // arrayMove is a Dnd Kit utility for reordering arrays
        return arrayMove(items, oldIndex, newIndex);
      });
      
      // Clear validation message when the user starts sorting again
      setMessage('');
      setIsCorrect(null);
    }
  }

  // --- Order Checking Function ---
  const checkOrder = () => {
    // Extract the complexity values from the current visual order
    const currentOrder = items.map(item => item.complexity);

    // Check if the array is sorted (e.g., [1, 3, 5])
    let correct = true;
    for (let i = 0; i < currentOrder.length - 1; i++) {
      if (currentOrder[i] > currentOrder[i + 1]) {
        correct = false;
        break;
      }
    }

    setIsCorrect(correct);
    if (correct) {
      setMessage("✅ Correct! The videos are sorted from least to most complex.");
    } else {
      setMessage("❌ Not quite right. Keep arranging the videos!");
    }
  };

  // 1. State for the modal
  const [openModal, setOpenModal] = useState(false);

  // 2. Handlers for the modal
  const handleOpen = () => setOpenModal(true);
  const handleClose = () => setOpenModal(false);



  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Video Complexity Sorter 🎥
      </Typography>
      <Typography variant="subtitle1" paragraph>
        Drag and drop the videos from **Least Complex** (top) to **Most Complex** (bottom).
      </Typography>

      <Box sx={{ 
        border: '2px dashed #ccc', 
        borderRadius: '8px', 
        padding: '10px', 
        minHeight: '200px',
        backgroundColor: '#f5f5f5'
      }}>
        {/* 1. Dnd Context: Provides global drag-and-drop management */}
        <DndContext 
          collisionDetection={closestCenter} // Standard collision detection
          onDragEnd={handleDragEnd}
        >
          {/* 2. Sortable Context: Provides the context for sortable items */}
          <SortableContext 
            items={itemIds} // Pass the array of item IDs
            strategy={verticalListSortingStrategy} // Use a standard vertical list sorting strategy
          >
            {items.map((item) => (
              <VideoCard 
                key={item.id} 
                itemData={item} // Pass the entire item data
              />
            ))}
          </SortableContext>
        </DndContext>
      </Box>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={checkOrder} 
        sx={{ mt: 3, padding: '10px 30px' }}
      >
        Check Order
      </Button>

      <Button 
          variant="outlined" 
          color="secondary" 
          onClick={exportToExcel} // Call the new function
          sx={{ padding: '10px 30px' }}
      >
        Export to Excel
      </Button>

      <Button 
        variant="outlined" 
        color="secondary" 
        onClick={handleOpen} // Opens the modal
        sx={{ mt: 3, mr: 2, padding: '10px 30px' }}
      >
        Email the Order
      </Button>
      </Box>

      /* Adding in email form model */
      <EmailFormModal 
        open={openModal} 
        handleClose={handleClose} 
      />
      {message && (
        <Typography 
          variant="h6" 
          sx={{ 
            mt: 2, 
            color: isCorrect ? 'success.main' : 'error.main' 
          }}
        >
          {message}
        </Typography>
      )}
    </Container>
  );
}