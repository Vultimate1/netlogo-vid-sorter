import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Typography from '@mui/material/Typography';
import { red } from '@mui/material/colors';
import { styled } from '@mui/material/styles';
// VideoCard.jsx (Updated for Dnd Kit)

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable'; // Import useSortable
import { CSS } from '@dnd-kit/utilities'; // Import CSS utility for transforms

// ... (All existing imports for MUI, Typography, Avatar, etc., remain the same)
// ... (Your existing interfaces and the 'ExpandMore' styled component remain the same)

// --- VideoCard Component ---


interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme }) => ({
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
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


// Now accepts 'id' for Dnd Kit and 'itemData' for the content
export default function VideoCard({ itemData }) {
  const { id, name, videoId } = itemData;

  // 1. Dnd Kit Hook: Connects the component to the sorting context
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // 2. Dnd Kit Styles: Apply transformations for smooth animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0, // Ensure the dragging item is on top
    opacity: isDragging ? 0.8 : 1, // Subtle visual feedback when dragging
    marginBottom: '10px',
  };
  
  // ... (Your existing 'extractDescription' function remains the same)
  const extractDescription = (id) => {
    // ... (Your original complex description extraction logic)
    if (!id) return '';
    console.log(id);
    const attrs = id.split('_');
    const dateStr = attrs[0].split("//")[1]; 
    const [timePart, period, day, monthStr, year] = dateStr.split("-");
    const [hhmmss, ms] = timePart.split(".");
    let hours = parseInt(hhmmss.slice(0, 2));
    const minutes = parseInt(hhmmss.slice(2, 4));
    const seconds = parseInt(hhmmss.slice(4, 6));
    const milliseconds = parseInt(ms);
        
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
    const month = months[monthStr];
    const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
    
    const pad = (n) => n.toString().padStart(2, '0');
    const formattedDate = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear().toString().slice(-2)}`;

    const vision = attrs[1]?.split('=')[1] || '?';
    const minsep = attrs[2]?.split('=')[1] || '?';
    const maxalignturn = attrs[3]?.split('=')[1] || '?';
    const maxcohereturn = attrs[4]?.split('=')[1] || '?';
    const maxsepturn = attrs[5]?.split('=')[1] || '?';
    const population = attrs[6]?.split('=')[1] || '?';

    const desc = 
    `${formattedDate}
    Vision: ${vision}
    Minimum separation: ${minsep}
    Maximum alignment turn: ${maxalignturn}
    Maximum coherence turn: ${maxcohereturn}
    Maximum separation turn: ${maxsepturn}
    Population: ${population}`;
    return String(desc);
  };
  // End of extractDescription

  const descriptionText = extractDescription(videoId); // Use videoId for extraction

  const [expanded, setExpanded] = React.useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Card 
      // 3. Connect to Dnd Kit
      ref={setNodeRef}
      style={style}
      // Apply listeners and attributes to the card itself to make the whole card draggable
      {...attributes}
      {...listeners}
      sx={{ 
        maxWidth: 345, 
        maxHeight: 500, 
        margin: '10px auto', 
        cursor: 'grab', 
        backgroundColor: isDragging ? '#e3f2fd' : '#fff' // Style change on drag
      }}
    >
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: red[500] }} aria-label="recipe">
            R
          </Avatar>
        }
        action={
          <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        }
        title={name || "Video"}
        subheader="Generated from filename"
      />
      <CardMedia
        component="video"
        height="194"
        image={`${videoId}`}
        alt={`${videoId}`}
        controls
        muted
        autoPlay={false}
        sx={{ objectFit: 'cover', }}
      />
      <CardActions>
        <ExpandMore
          expand={expanded}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMoreIcon />
        </ExpandMore>
      </CardActions>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
      <CardContent>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
          {descriptionText}
        </Typography>
      </CardContent>
      </Collapse>
    </Card>
  );
}