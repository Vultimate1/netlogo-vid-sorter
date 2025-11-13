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
  Collapse,
  Paper,
  CircularProgress,
  IconButton, IconButtonProps,
Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,

} from '@mui/material';
import { styled } from '@mui/system';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmailIcon from '@mui/icons-material/Email';
import DownloadIcon from '@mui/icons-material/Download';

import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import DoneAllIcon from '@mui/icons-material/DoneAll';


// --- CONFIGURATION ---

const JSON_FILE_PATH = 'json-videos.JSON'; 

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


// --- 2. STYLED COMPONENTS (Conditional Layout) ---

// Styled component for the sortable wrapper. 
const SortableItem = styled(Paper, {
    shouldForwardProp: (prop) => prop !== '$layoutmode',
})(({ theme, $layoutmode }) => ({
  display: 'flex',
  // Conditional flex-direction for the item's internal layout
  flexDirection: $layoutmode === 'vertical' ? 'column' : 'row',
  alignItems: $layoutmode === 'vertical' ? 'center' : 'center',
  padding: '12px',
  margin: '8px 0',
  cursor: 'grab',
  boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
  width: $layoutmode === 'vertical' ? '250px' : '100%', 
  gap: '16px',
  transition: 'all 0.3s ease-in-out',

  '&:hover': {
    boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
  },
  
  // Custom styling for the video element inside the item
  '& video': {
    borderRadius: '6px',
    // Conditional width based on layout mode
    width: $layoutmode === 'vertical' ? '220px' : '300px', // Enlarged for horizontal row layout
    height: $layoutmode === 'vertical' ? '300px' : '220px',
    transition: 'width 0.3s ease-in-out',
  },
}));

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


// --- 3. SORTABLE ITEM COMPONENT ---

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
    
    return [vision, minsep, maxalignturn, maxcohereturn, maxsepturn, pop, String(desc)];
  };

const SortableVideoItem = React.memo(({ id, itemData, layoutMode, rank }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: transform ? 99 : 1, // Keep dragged item on top
    };

    const isHorizontal = layoutMode === 'horizontal';
  const [expanded, setExpanded] = React.useState(false);
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
    
    // Determine the flex properties for the content area based on layoutMode
    const contentBoxStyle = isHorizontal ? { flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } : { textAlign: 'center' };

  

  const [vision, minsep, maxalignturn, maxcohereturn, maxsepturn, pop, descriptionText] = extractDescription(itemData.src.replace("../public/", ""));

    return (
        <SortableItem 
            ref={setNodeRef} 
            style={style} 
            $layoutmode={layoutMode} 
            {...attributes}
        >
            {/* The Drag Handle (always first for accessibility) */}
            <IconButton 
                {...listeners} 
                aria-label="Drag video" 
                sx={{ 
                    alignSelf: isHorizontal ? 'flex-start' : 'center',
                    mt: isHorizontal ? 1 : 0
                }}
            >
                <DragHandleIcon />
            </IconButton>

            {/* Video Element */}
            <video 
                src={itemData.src} 
                loop 
                muted 
                playsInline 
                controls={false}
                onMouseOver={e => e.currentTarget.play()}
                onMouseOut={e => e.currentTarget.pause()}
                preload="metadata" // Load metadata first
            />

            {/* Content Area */}
            <Box sx={contentBoxStyle}>
                <Typography variant="body1" fontWeight="bold">
                    {itemData.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: isHorizontal ? 0 : 1 }}>
                    **Current Rank:** {rank}
                </Typography>
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
                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                    {itemData.originalName}
                </Typography>
            </Box>
        </SortableItem>
    );
});


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
  console.log("in email form");
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



// --- 5. CORE SORTER COMPONENT ---

const ComplexitySorter = ({ initialItems, layoutMode }) => {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState('');
  
  // Update internal items state when initialItems prop changes
  useEffect(() => {
      setItems(initialItems);
      setMessage('');
  }, [initialItems]);


  const itemIds = items.map((item) => item.id);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setMessage(''); 
    }
  }
  const [openModal, setOpenModal] = useState(false);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  // Function to download the current order as a CSV file (Excel compatible)
  const downloadOrderAsCSV = () => {
    // 1. Define CSV headers
    const headers = [
      "Rank", 
      "Video Name", 
      "Target Complexity Rank (1=Least Complex)",
      "Vision", 
      "Minimum separation", 
      "Maximum alignment turn", 
      "Maximum coherence turn", 
      "Maximum separation", 
      "Population",
      // Add the grouping parameters to the CSV headers
    ];
    
    // 2. Map items to CSV rows
    const csvRows = items.map((item, index) => {
      // Parse parameters again to include their values in the CSV
      const params = extractDescription(item.src);
      var param = []
      for (let i=0; i<params.length-1; i++) {
          param.push(params[i]);
      }
      console.log(params);
      //const paramValues = groupingParameters.map(p => params[p] !== undefined ? params[p] : 'N/A');
      
      const videoName = `"${item.name.replace(/"/g, '""')}"`;
      return [
        index + 1, // Current Rank
        videoName, 
        item.correctComplexity,
        param,
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

  // New function for subjective ranking completion
  const handleFinalizeOrder = () => {
    setMessage(
        `✅ Sorting Finalized! You have successfully ranked the ${items.length} videos from Least Complex (top/left) to Most Complex (bottom/right) based on your visual assessment.`
    );
  };
  
  const shuffleItems = () => {
    setItems(shuffleArray(items));
    setMessage('');
  };
  
  // Calculate grid template columns for horizontal layout
  const gridTemplateColumns = layoutMode === 'horizontal' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr';
  
  // Determine if the primary sorting direction is horizontal (uses a grid flow) or vertical
  const sortStrategy = verticalListSortingStrategy;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom align="center" fontWeight="600" color="primary">
        Visual Complexity Sorter
      </Typography>
      <Typography variant="subtitle1" align="center" color="textSecondary" sx={{ mb: 3 }}>
        Drag and drop the videos to rank them from **Least Complex** (top/left) to **Most Complex** (bottom/right).
      </Typography>
      
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'center',
        gap: 2,
        mb: 3
      }}>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={shuffleItems} 
            startIcon={<ShuffleIcon />}
          >
            Shuffle
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleFinalizeOrder} 
            startIcon={<DoneAllIcon />}
            disabled={items.length === 0}
          >
            Finalize Sorting
          </Button>
      </Box>

      <Box sx={{ 
        border: '2px dashed #ccc', 
        borderRadius: '12px', 
        padding: '16px', 
        minHeight: '200px',
        backgroundColor: '#f9f9f9',
        display: layoutMode ==='horizontal' ? '100%' : 'flex' , // Use grid for dynamic layout
        justifyContent: 'center',

        gridTemplateColumns: gridTemplateColumns,
        gap: '16px', // Gap between grid items
        transition: 'all 0.3s ease-in-out'
      }}>
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={itemIds} 
            strategy={sortStrategy} 
          >
            {items.map((item, index) => (
              <SortableVideoItem 
                key={item.id} 
                id={item.id}
                itemData={item} 
                layoutMode={layoutMode} 
                rank={index + 1}
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
        <Typography 
          variant="h6"
          align="center"
          sx={{ mt: 3, color: 'success.main' }}
        >
          {message}
        </Typography>
      )}
      <EmailFormModal 
        open={openModal} 
        handleClose={handleCloseModal} 
        orderedItems={items}
      />
    </Container>
  );
};


// --- 5. MAIN APP COMPONENT ---

function App() {
  const [data, setData] = useState(null);
  const [videodata, setVideodata] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [fullDataset, setFullDataset] = useState([]);
  const [isExperimentMode, setIsExperimentMode] = useState(false);
  
  // State for layout mode
  const [layoutMode, setLayoutMode] = useState('vertical'); 

  const toggleLayout = () => {
    setLayoutMode(prevMode => prevMode === 'vertical' ? 'horizontal' : 'vertical');
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(JSON_FILE_PATH);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const jsondata = await response.json();
        setData(jsondata);

        // Map and clean up all videos, ready for selection
        const allVideos = jsondata.map((f) => ({
            // Use the video path itself as a robust, unique ID
            id: f.id.replace("../public", ""), 
            name: f.name.match(/VID\d+/)?.[0] || 'Unknown Video',
            originalName: f.name, // Keep original name for debugging/display
            src: f.id.replace("../public", ""),
        }));
        
        setFullDataset(allVideos);
        // Start by displaying the first 5 videos (shuffled)
        setVideodata(shuffleArray(allVideos).slice(0, 5)); 
        setIsExperimentMode(true); // Start in experiment mode for simplicity
        setIsLoading(false);

      } catch (error) {
        console.error('Failed to fetch JSON data:', error);
        setIsError(true);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []); 

  const startExperiment = () => {
    if (fullDataset.length < 5) return;
    
    // Select 5 unique random videos from the full dataset
    const shuffled = shuffleArray(fullDataset);
    const experimentVideos = shuffled.slice(0, 5);

    setVideodata(shuffleArray(experimentVideos)); 
    setIsExperimentMode(true);
  };

  const resetToAll = () => {
    setVideodata(shuffleArray(fullDataset));
    setIsExperimentMode(false);
  };

  if (isLoading) {
      return (
          <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 5 }}>
              <CircularProgress color="primary" size={50} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                  Loading video metadata...
              </Typography>
          </Container>
      );
  }

  if (isError || !data) {
      return (
          <Container maxWidth="sm" sx={{ mt: 5 }}>
              <Typography variant="h5" color="error">
                  Error Loading Data
              </Typography>
              <Typography variant="body1" color="textSecondary">
                  Failed to load video metadata from `{JSON_FILE_PATH}`. Please ensure the file exists and is correctly formatted.
              </Typography>
          </Container>
      );
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 4 }}>
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 4, 
            p: 2,
            borderBottom: '1px solid #eee'
        }}>
            <Typography variant="h6" component="h1" fontWeight="bold">
                Visual Sorting Control ({videodata.length} Videos)
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <IconButton 
                    onClick={toggleLayout}
                    color="primary"
                    aria-label={`Switch to ${layoutMode === 'vertical' ? 'horizontal' : 'vertical'} layout`}
                    title={`Switch to ${layoutMode === 'vertical' ? 'horizontal' : 'vertical'} layout`}
                >
                    {layoutMode === 'vertical' ? <ViewModuleIcon /> : <ViewListIcon />}
                </IconButton>

                {isExperimentMode ? (
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={startExperiment} 
                        size="small"
                        sx={{ borderRadius: '20px' }}
                    >
                        Load New Random 5
                    </Button>
                ) : (
                    <Button 
                        variant="outlined" 
                        color="primary" 
                        onClick={startExperiment} 
                        disabled={fullDataset.length < 5}
                        size="small"
                        sx={{ borderRadius: '20px' }}
                    >
                        Start 5-Video Random Sort
                    </Button>
                )}
                {isExperimentMode && videodata.length > 5 && (
                    <Button 
                        variant="outlined" 
                        color="secondary" 
                        onClick={resetToAll} 
                        size="small"
                        sx={{ borderRadius: '20px' }}
                    >
                        Reset to Full Dataset
                    </Button>
                )}
            </Box>
        </Box>
      
      <ComplexitySorter 
        initialItems={videodata} 
        layoutMode={layoutMode} 
      />
    </Container>
  );
}

export default App;
