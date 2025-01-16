import { useEffect } from 'react';
import { Grid, Card, CardMedia, CardContent, Typography, Box, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import Image from 'next/image';
import Link from 'next/link';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Define interfaces for the blog post structure
interface SanitySlug {
    current: string;
}

interface SanityImage {
    asset: {
        image_url: string;
    };
}

interface SanityBlock {
    _type: 'block';
    children?: {
        text: string;
    }[];
}

interface BlogPost {
    _id: string;
    title: string;
    slug?: SanitySlug;
    mainImage?: SanityImage;
    content?: SanityBlock[];
}

interface BlogListingProps {
    blogList: BlogPost[];
}

const StyledCard = styled(Card)(({ theme }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
        transform: 'translateY(-4px)',
    },
}));

const StyledCardMedia = styled(CardMedia)({
    position: 'relative',
    height: '200px',
    width: '100%',
});

const Category = styled(Typography)({
    color: '#666',
    fontSize: '0.875rem',
    marginBottom: '8px',
});

const ReadMore = styled(Typography)({
    color: '#0066cc',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginTop: 'auto',
    '&:hover': {
        textDecoration: 'underline',
    },
});

// Default image URL (replace with your actual default image URL)
const DEFAULT_IMAGE_URL = '/api/placeholder/400/320';

const BlogListing = ({ blogList }: BlogListingProps) => {
    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: true,
        });
    }, []);

    const getPlainText = (content?: SanityBlock[]): string => {
        if (!content) return '';

        return content
            .map(block => {
                if (block._type !== 'block' || !block.children) return '';
                return block.children
                    .map(child => child.text)
                    .join('');
            })
            .join('\n\n');
    };

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Grid container spacing={3} sx={{ marginTop: '60px' }}>
                {blogList.map((post, index) => {
                    const plainTextContent = getPlainText(post.content);
                    const imageUrl = post?.mainImage?.asset?.image_url || DEFAULT_IMAGE_URL;

                    return (
                        <Grid item xs={12} sm={6} md={4} key={post._id} data-aos="fade-up" data-aos-delay={index * 100}>
                            <Link
                                href={`/blog/${post?.slug?.current}`}
                                passHref
                                style={{ textDecoration: 'none' }}
                            >
                                <StyledCard>
                                    <StyledCardMedia>
                                        <Image
                                            src={imageUrl}
                                            alt={post.title}
                                            layout="fill"
                                            objectFit="cover"
                                            priority={index < 6}
                                        />
                                    </StyledCardMedia>
                                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Typography
                                            variant="h6"
                                            component="h2"
                                            sx={{
                                                mb: 2,
                                                fontWeight: 600,
                                                color: '#1a1a1a',
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {post.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        >
                                            {plainTextContent}
                                        </Typography>
                                        <ReadMore>read more</ReadMore>
                                    </CardContent>
                                </StyledCard>
                            </Link>
                        </Grid>
                    );
                })}
            </Grid>
        </Container>
    );
};

export default BlogListing;