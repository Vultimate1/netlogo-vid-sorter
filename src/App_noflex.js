import React, { useState, useEffect, useRef } from 'react';
import { 
  DndContext, 
  closestCenter, 
  useSensor, 
  useSensors, 
  PointerSensor,
  KeyboardSensor
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  arrayMove, 
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { 
  Button, 
  Typography, 
  Container, 
  Box, 
  Paper,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  CircularProgress,
  Collapse, 
  IconButton, IconButtonProps,
} from '@mui/material';
import { styled } from '@mui/system';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ThemeProvider  } from '@mui/material/styles';

// --- 1. UTILITIES ---

/**
 * Utility function to shuffle array
 * @param {Array} array 
 * @returns {Array} A new shuffled array
 */
const shuffleArray = (array) => {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

/**
 * Selects a random subset of a specified size from an array.
 * If the array size is less than the required size, it returns the entire array, shuffled.
 * @param {Array} array - The source array.
 * @param {number} size - The desired subset size.
 * @returns {Array} A randomly selected subset.
 */
const getRandomSubset = (array, size) => {
    if (array.length <= size) {
        return shuffleArray(array);
    }
    const shuffled = shuffleArray(array);
    return shuffled.slice(0, size);
};

/**
 * Extracts parameters (e.g., vis=10, pop=155) from the video file path/key string.
 * @param {string} keyString - The video file path or combined key string.
 * @returns {Object<string, number>} An object mapping parameter keys to float values.
 */
const parseParams = (keyString) => {
  const params = {};
  
  // Try to extract filename first, otherwise use the string as-is (useful for combined keys)
  const partToParse = keyString.split('/').pop() || keyString; 
  
  // Split by underscore, skipping the first part if it looks like a date/name stamp (only if it's a file path)
  const isFilePath = keyString.includes('.mp4');
  const parts = partToParse.split('_');
  const paramParts = isFilePath ? parts.slice(1) : parts;

  paramParts.forEach(part => {
    const [key, paramvalue] = part.split('=');
    if (key && paramvalue) {
      // Use parseFloat to handle potential non-integer values
      params[key] = parseFloat(paramvalue);
    }
  });
  return params;
};

/**
 * Creates a unique group key string based on specified parameter names.
 * @param {Object} params - Object of all parsed parameters for a video.
 * @param {string[]} paramNames - Array of parameter names to include in the key.
 * @returns {string} Combined key string, e.g., "maxsepturn=3_vis=10".
 */
const getCombinedGroupKey = (params, paramNames) => {
  return paramNames
    .map(name => `${name}=${params[name]}`)
    .join('_');
};


// --- 2. STYLED COMPONENTS ---

const SortableItem = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '10px',
  margin: '8px 0',
  borderRadius: '8px',
  cursor: 'grab',
  transition: 'box-shadow 0.3s, background-color 0.3s',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
}));

// --- 3. VIDEO CARD (Sortable Item) ---

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme }) => ({
  marginLeft: 'auto',
  transition: 'transform 0.3s ease-in-out',
  variants: [
    {
      props: ({ expand }) => !expand,
      style: {
        transform: 'rotate(0deg)',
      },
    },
    {
      props: ({ expand }) => !!expand,
      style: {
        transform: 'rotate(180deg)',
      },
    },
  ],
}));



const VideoCard = ({ itemData, currentRank }) => {

  const [expanded, setExpanded] = React.useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemData.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0, 
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.05)',
  };
  console.log("in video card: ", itemData);
  const extractDescription = (name) => {
    if (!name) return '';
    //console.log(name);
    //src = src.replace("/swarm-videos//", "");
    const attrs = name.split('_');
    const dateStr = attrs[0].split("//")[1]; 
    //console.log("Date: ", {dateStr})

    // Split date parts: "111407.893-PM-25-Aug-2025"
    const [timePart, period, day, monthStr, year] = dateStr.split("-");
    const [hhmmss, ms] = timePart.split(".");
    let hours = parseInt(hhmmss.slice(0, 2));
    const minutes = parseInt(hhmmss.slice(2, 4));
    const seconds = parseInt(hhmmss.slice(4, 6));
    const milliseconds = parseInt(ms);
    //console.log(hours, minutes, seconds, milliseconds);
    
    // Convert to 24-hour format
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    // Parse date
    const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
    const month = months[monthStr];
    const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
    //console.log("month and date: ", month, date);
    const pad = (n) => n.toString().padStart(2, '0');
    const formattedDate = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear().toString().slice(-2)}`;
    //console.log("formatted date: ", {formattedDate});

    // get all parameters safely
    const vision = attrs[1]?.split('=')[1] || '?';
    const minsep = attrs[2]?.split('=')[1] || '?';
    const maxalignturn = attrs[3]?.split('=')[1] || '?';
    const maxcohereturn = attrs[4]?.split('=')[1] || '?';
    const maxsepturn = attrs[5]?.split('=')[1] || '?';
    const population = attrs[6]?.split('=')[1] || '?';
    const pop = population.split(".")[0];

    const desc = 
    `Date taken: ${formattedDate}
    Vision: ${vision}
    Minimum separation: ${minsep}
    Maximum alignment turn: ${maxalignturn}
    Maximum coherence turn: ${maxcohereturn}
    Maximum separation turn: ${maxsepturn}
    Population: ${pop}`;
    
    return String(desc);
  };

  const descriptionText = extractDescription(itemData.srcPath.replace("../public/", ""));
  //console.log("Rendering description: ", descriptionText);

  return (
    <SortableItem ref={setNodeRef} style={style} {...attributes} {...listeners} elevation={3}>
      {/* Video Element */}
      <Box 
        sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, cursor: 'grab' }}
        {...attributes} 
        {...listeners}
      >
      <video
        src={itemData.srcPath} // Now correctly using the cleaned srcPath
        controls 
        style={{
          width: '100px',
          height: '60px',
          objectFit: 'cover',
          borderRadius: '4px',
          marginRight: '15px',
          backgroundColor: '#000' 
        }}
        onError={(e) => {
            console.error(`Error loading video for ${itemData.name}:`, e.target.error);
            // Fallback for broken video paths
            e.target.style.display = 'none'; 
            const fallbackDiv = document.createElement('div');
            fallbackDiv.style.width = '100px';
            fallbackDiv.style.height = '60px';
            fallbackDiv.style.display = 'flex';
            fallbackDiv.style.alignItems = 'center';
            fallbackDiv.style.justifyContent = 'center';
            fallbackDiv.style.borderRadius = '4px';
            fallbackDiv.style.marginRight = '15px';
            fallbackDiv.style.backgroundColor = '#FFCCCC';
            fallbackDiv.style.color = '#CC0000';
            fallbackDiv.style.fontSize = '10px';
            fallbackDiv.style.textAlign = 'center';
            fallbackDiv.textContent = 'Video Failed to Load';
            e.target.parentNode.insertBefore(fallbackDiv, e.target);
        }}
        muted 
        loop
      >
        Your browser does not support the video tag.
      </video>

      <Box>
        <Typography variant="subtitle1" fontWeight="bold">{itemData.name}</Typography>
        <Typography variant="body2" color="textSecondary">
          Current Rank: {currentRank} (Target: {itemData.correctComplexity})
        </Typography>

      </Box>

        <ExpandMore
          expand={expanded}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show parameters"
          title="Toggle Parameters"
          sx={{ ml: 1 }} // Add margin for spacing
        >
          <ExpandMoreIcon />
        </ExpandMore>
      </Box>

      <Collapse in={expanded} timeout={100} unmountOnExit>
      <Box sx={{ 
            pt: 1, 
            mt: 1, 
            pl: '115px', // Aligns description text with video name
            borderTop: '1px solid #eee', 
            width: '100%', 
            backgroundColor: '#f9f9f9',
            borderRadius: '0 0 8px 8px',
            pr: 1, pb: 1 
        }}>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
          <strong style={{ color: '#007bff' }}>{descriptionText}</strong>
        </Typography>

      </Box>
      </Collapse>
    </SortableItem>
  );
};

// --- 4. EMAIL FORM MODAL COMPONENT (Unchanged) ---

// *** IMPORTANT: REPLACE THESE WITH YOUR ACTUAL EMAILJS KEYS ***
const SERVICE_ID = 'service_oua0645'; 
const TEMPLATE_ID = 'template_0sn1aba'; 
const PUBLIC_KEY = '79TzH81kp9RcNqdrX'; 

const loadEmailJSSDK = () => {
    return new Promise((resolve, reject) => {
        if (window.emailjs) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = "https://cdn.emailjs.com/sdk/2.4.7/email.min.js";
        script.onload = () => {
            if (window.emailjs) {
                window.emailjs.init(PUBLIC_KEY);
                resolve();
            } else {
                reject(new Error("EmailJS script loaded, but global object missing."));
            }
        };
        script.onerror = () => reject(new Error("Failed to load the EmailJS SDK."));
        document.head.appendChild(script);
    });
};


const EmailFormModal = ({ open, handleClose, orderedItems }) => {
  const form = useRef();
  const [isSending, setIsSending] = useState(false);
  const [emailServiceReady, setEmailServiceReady] = useState(false);
  const [sendError, setSendError] = useState(null);

  useEffect(() => {
    loadEmailJSSDK()
        .then(() => setEmailServiceReady(true))
        .catch((error) => {
            setSendError("Email service failed to initialize (SDK Error). Please check network or console for details.");
        });
  }, []);

  const sendEmail = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setSendError(null);
    
    const orderList = orderedItems.map((item, index) => 
        `${index + 1}. ${item.name} (Target Rank: ${item.correctComplexity})`
    ).join('\n');
    
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = 'complexity_order_list'; 
    hiddenInput.value = `User's Final Order:\n${orderList}`;
    form.current.appendChild(hiddenInput);

    try {
        if (!window.emailjs) {
            throw new Error("EmailJS is not loaded or initialized.");
        }
        
        const result = await window.emailjs.sendForm(
            SERVICE_ID, 
            TEMPLATE_ID, 
            form.current, 
            PUBLIC_KEY
        );

        if (result.status === 200) {
            console.log('Message sent successfully!');
            handleClose(); 
        } else {
            throw new Error(`EmailJS API returned status: ${result.status} - ${result.text}`);
        }

    } catch(error) {
        console.error('Failed to send message:', error);
        setSendError("Failed to send email. Check SERVICE_ID, TEMPLATE_ID, and PUBLIC_KEY constants in the code.");
    } finally {
        if (form.current && hiddenInput) {
            form.current.removeChild(hiddenInput);
        }
        setIsSending(false);
    }
  };

  const isKeyMissing = SERVICE_ID.includes('YOUR_') || TEMPLATE_ID.includes('YOUR_');
  const isFormDisabled = isSending || !emailServiceReady || isKeyMissing;

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Email the Video Complexity Order</DialogTitle>
      <form ref={form} onSubmit={sendEmail}>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your current sorted order will be included in the message.
          </Typography>
          
          {sendError && (
              <Box sx={{ p: 1, mb: 2, bgcolor: '#ffebee', border: '1px solid #f44336', borderRadius: '4px' }}>
                  <Typography color="error" variant="body2">{sendError}</Typography>
              </Box>
          )}
          
          {!emailServiceReady && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="body2" color="textSecondary">Initializing email service...</Typography>
              </Box>
          )}

          {isKeyMissing && (
              <Box sx={{ p: 1, mb: 2, bgcolor: '#fff3e0', border: '1px solid #ff9800', borderRadius: '4px' }}>
                  <Typography color="#ff9800" variant="body2">
                      <span style={{fontWeight: 'bold'}}>ACTION REQUIRED:</span> You still need to replace the placeholder **SERVICE_ID** and **TEMPLATE_ID** constants in the code to enable live emailing.
                  </Typography>
              </Box>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Your Name"
            type="text"
            fullWidth
            variant="outlined"
            name="from_name" 
            required
            size="small"
          />
          <TextField
            margin="dense"
            label="Your Email"
            type="email"
            fullWidth
            variant="outlined"
            name="from_email" 
            required
            size="small"
          />
          <TextField
            margin="dense"
            label="Additional Notes"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            name="message" 
            size="small"
            placeholder="E.g., 'Here is my proposed complexity ranking...'"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={isSending} variant="outlined">Cancel</Button>
          <Button 
            type="submit" 
            disabled={isFormDisabled} 
            variant="contained" 
            color="primary"
            startIcon={isSending ? null : <EmailIcon />}
          >
            {isSending ? <CircularProgress size={24} color="inherit" /> : 'Send Order'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// --- 5. COMPLEXITY SORTER COMPONENT ---

const ComplexitySorter = ({ initialItems, groupingParameters }) => {
  const [items, setItems] = useState([]); // Initialize empty/default
  const itemIds = items.map(item => item.id);
  const [message, setMessage] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Effect to initialize/reinitialize the list when the prop changes
  useEffect(() => {
      // Ensure initialItems is not empty before setting and shuffling
      if (initialItems && initialItems.length > 0) {
        // Shuffle the incoming list to ensure a non-ranked start state
        setItems(shuffleArray(initialItems));
        setMessage(null); // Clear status message when the list changes
      }
  }, [initialItems]);
  
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  
  // Function to download the current order as a CSV file (Excel compatible)
  const downloadOrderAsCSV = () => {
    // 1. Define CSV headers
    const headers = [
      "Rank", 
      "Video Name", 
      "Target Complexity Rank (1=Least Complex)",
      // Add the grouping parameters to the CSV headers
      ...groupingParameters.map(p => `Parameter ${p}`) 
    ];
    
    // 2. Map items to CSV rows
    const csvRows = items.map((item, index) => {
      // Parse parameters again to include their values in the CSV
      const params = parseParams(item.srcPath);
      const paramValues = groupingParameters.map(p => params[p] !== undefined ? params[p] : 'N/A');
      
      const videoName = `"${item.name.replace(/"/g, '""')}"`;
      return [
        index + 1, // Current Rank
        videoName, 
        item.correctComplexity,
        ...paramValues
      ].join(',');
    });
    
    const content = [
      headers.join(','),
      ...csvRows
    ].join('\n');
    
    // 3. Create a Blob and download link
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 4. Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'video_complexity_order.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); 
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.findIndex(item => item.id === active.id);
        const newIndex = prevItems.findIndex(item => item.id === over.id);
        return arrayMove(prevItems, oldIndex, newIndex);
      });
      setMessage(null);
    }
  };

  const checkOrder = () => {
    let isCorrect = true;
    const sortedItems = [...items].sort((a, b) => a.correctComplexity - b.correctComplexity);
    
    items.forEach((item, index) => {
      if (item.id !== sortedItems[index].id) {
            isCorrect = false;
        }
    });

    if (isCorrect) {
      setMessage({ type: 'success', text: 'Success! The videos are sorted correctly from Least Complex to Most Complex.' });
    } else {
      setMessage({ 
        type: 'error', 
        text: (
            <>
                <Typography variant="h6" color="error">Incorrect Order</Typography>
                <Typography variant="body1">The order is not correct. Videos should be sorted based on their underlying complexity rank (1 to {items.length} from top to bottom).</Typography>
            </>
        )
      });
    }
  };
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, bgcolor: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center" fontWeight="700" color="primary.main">
          Video Complexity Sorter
        </Typography>
        <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 3 }}>
          Drag and drop the items below to arrange them from **Least Complex** (top) to **Most Complex** (bottom).
          <br/>
          <Typography variant="caption" color="textPrimary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
            (Currently displaying **{items.length}** videos, each representing a unique combination of **{groupingParameters.join('** and **')}** parameters.)
          </Typography>
        </Typography>

        <Box sx={{ 
          border: '2px solid #e0e0e0', 
          borderRadius: '10px', 
          padding: '10px', 
          minHeight: '280px',
          backgroundColor: '#fafafa'
        }}>
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item, index) => (
                <VideoCard 
                  key={item.id} 
                  itemData={item} 
                  currentRank={index + 1} 
                />
              ))}
            </SortableContext>
          </DndContext>
        </Box>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={downloadOrderAsCSV} 
            sx={{ padding: '10px 30px', borderRadius: '25px' }}
            startIcon={<DownloadIcon />}
          >
            Download CSV
          </Button>

          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleOpenModal} 
            sx={{ padding: '10px 30px', borderRadius: '25px' }}
            startIcon={<EmailIcon />}
          >
            Email the Order
          </Button>

          <Button 
            variant="contained" 
            color="primary" 
            onClick={checkOrder} 
            sx={{ padding: '10px 30px', borderRadius: '25px' }}
            startIcon={<CheckCircleOutlineIcon />}
          >
            Check Order
          </Button>
          
          <Button 
            variant="text" 
            color="default" 
            onClick={() => setItems(shuffleArray(items))} 
            sx={{ padding: '10px 30px', borderRadius: '25px' }}
            startIcon={<ShuffleIcon />}
          >
            Shuffle List
          </Button>

        </Box>

        {message && (
          <Box 
            sx={{ 
              mt: 3, 
              p: 2, 
              borderRadius: '8px',
              border: `2px solid ${message.type === 'success' ? '#4caf50' : '#f44336'}`,
              backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee'
            }}
          >
            {typeof message.text === 'string' 
                ? <Typography color={message.type === 'success' ? 'success.main' : 'error.main'}>{message.text}</Typography>
                : message.text}
          </Box>
        )}
      </Box>
      
      <EmailFormModal 
        open={openModal} 
        handleClose={handleCloseModal} 
        orderedItems={items}
      />
    </Container>
  );
};

// --- 6. MAIN APP COMPONENT ---

const JSON_FILE_PATH = 'json-videos.JSON';

function App_noflex() {
  // Store the full dataset of unique, ranked videos
  const [fullRankedDataset, setFullRankedDataset] = useState([]); 
  // Store the current list displayed to the user
  const [videodata, setVideodata] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isExperimentMode, setIsExperimentMode] = useState(false);

  // Configuration for which parameters to group by and use for ranking
  const GROUPING_CONFIG = {
    paramNames: ['maxsepturn', 'vis'], 
    // Define the order of complexity sorting: primary, then secondary
    primarySortParam: 'maxsepturn', 
    secondarySortParam: 'vis',
  };

  useEffect(() => {
    async function fetchData() {
        try {
            const response = await fetch(JSON_FILE_PATH);
            
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error('Failed to load JSON data.');
            }
            
            const rawData = await response.json();
            
            // 1. Group all videos based on the combined key
            const groupedVideos = {}; // Key: "maxsepturn=3_vis=10", Value: [video1, video2, ...]
            rawData.forEach(file => {
                const params = parseParams(file.id);
                const key = getCombinedGroupKey(params, GROUPING_CONFIG.paramNames);
                
                // Only include videos that have all required parameters defined
                const allParamsExist = GROUPING_CONFIG.paramNames.every(p => params[p] !== undefined && !isNaN(params[p]));
                
                if (allParamsExist) {
                    if (!groupedVideos[key]) groupedVideos[key] = [];
                    
                    // FIX: Clean the video URL by removing the incorrect local path prefix
                    const cleanPath = file.id.replace('../public/', '');

                    // Prepare the object with parsed parameters before grouping
                    groupedVideos[key].push({
                        ...file, 
                        srcPath: cleanPath, // Use the cleaned path for the video source
                        id: file.name, // Use name as ID for Dnd-Kit stability
                        parsedParams: params // Store params for easy sorting later
                    });
                }
            });
            
            // 2. Sort the unique group keys (representing the complexity ranks)
            const sortedKeys = Object.keys(groupedVideos).sort((keyA, keyB) => {
              const paramsA = parseParams(keyA);
              const paramsB = parseParams(keyB);
              
              // Primary sort: 'maxsepturn' (lower value = less complex)
              const primaryDiff = paramsA[GROUPING_CONFIG.primarySortParam] - paramsB[GROUPING_CONFIG.primarySortParam];
              if (primaryDiff !== 0) return primaryDiff;
              
              // Secondary sort: 'vis' (lower value = less complex)
              const secondaryDiff = paramsA[GROUPING_CONFIG.secondarySortParam] - paramsB[GROUPING_CONFIG.secondarySortParam];
              return secondaryDiff;
            });
            
            // 3. Select one random video from each sorted group and assign rank
            let selectedAndRankedVideos = [];
            sortedKeys.forEach((key, index) => {
              const group = groupedVideos[key];
              if (group.length > 0) {
                const randomIndex = Math.floor(Math.random() * group.length);
                const selectedVideo = { ...group[randomIndex] }; // Create a copy
                
                // Assign the complexity rank based on the sorted group index
                selectedVideo.correctComplexity = index + 1; 
                
                selectedAndRankedVideos.push(selectedVideo);
              }
            });

            // 4. Store the full list and set initial display list to ALL videos
            setFullRankedDataset(selectedAndRankedVideos);
            
            // Set videodata to the full, shuffled list
            setVideodata(shuffleArray(selectedAndRankedVideos)); 
            
            // Initial state is NOT experiment mode
            setIsExperimentMode(false); 

        } catch(error) {
            console.error('Failed to fetch JSON data:', error);
            setVideodata([]); 
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, []); 

  // Function to initiate the 5-video experiment mode
  const startExperiment = () => {
      if (fullRankedDataset.length >= 5) {
          const subset = getRandomSubset(fullRankedDataset, 5);
          setVideodata(subset);
          setIsExperimentMode(true);
      }
  };
  
  // Function to reset to the full dataset
  const resetToAll = () => {
    setVideodata(shuffleArray(fullRankedDataset));
    setIsExperimentMode(false);
  }

  if (isLoading) {
      return (
          <Container maxWidth="md" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress color="primary" />
              <Typography sx={{ mt: 2 }}>Loading and processing video data from {JSON_FILE_PATH}...</Typography>
          </Container>
      );
  }

  if (fullRankedDataset.length === 0) {
      return (
          <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="h5" color="error">
                Failed to load or process video data. 
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Ensure `{JSON_FILE_PATH}` is valid and contains videos with the required parameters: **{GROUPING_CONFIG.paramNames.join(', ')}**.
              </Typography>
          </Container>
      );
  }

  return (
    <>
      <Container maxWidth="md" sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
          <Box sx={{ 
              p: 2, 
              bgcolor: isExperimentMode ? '#e3f2fd' : '#f0f4ff', 
              borderRadius: '10px', 
              border: `2px solid ${isExperimentMode ? '#42a5f5' : '#cdd8ff'}`,
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
          }}>
              <Typography variant="h6" gutterBottom fontWeight="600">
                Experiment Setup
              </Typography>
              
              {isExperimentMode ? (
                  <>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
                        Currently sorting a **random subset of 5** videos for the experiment.
                    </Typography>
                    <Button 
                        variant="outlined" 
                        color="secondary" 
                        onClick={resetToAll} 
                        size="small"
                        sx={{ borderRadius: '20px' }}
                    >
                        Reset to Full Dataset ({fullRankedDataset.length} videos)
                    </Button>
                  </>
              ) : (
                  <>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
                        Full dataset loaded ({fullRankedDataset.length} unique complexity groups).
                    </Typography>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={startExperiment} 
                        disabled={fullRankedDataset.length < 5}
                        size="medium"
                        sx={{ borderRadius: '20px' }}
                    >
                        Start 5-Video Random Experiment
                    </Button>
                    {fullRankedDataset.length < 5 && (
                         <Typography variant="caption" display="block" color="error" sx={{ mt: 1 }}>
                            Need at least 5 unique videos to enable the experiment mode.
                         </Typography>
                    )}
                  </>
              )}
          </Box>
      </Container>
      
      <ComplexitySorter 
        initialItems={videodata} 
        groupingParameters={GROUPING_CONFIG.paramNames}
      />
    </>
  );
}

export default App_noflex;
